import { NextRequest, NextResponse } from "next/server";
import { runSelectsOnData } from "@/lib/sqlOnData";
import type { ParsedData } from "@/types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "anthropic/claude-4.6-opus";
const DEFAULT_API_KEY = "[REDACTED]";
const MAX_RESULT_ROWS_FOR_LLM = 200;
const MAX_TOOL_ROUNDS = 20000;

type MessageRole = "system" | "user" | "assistant" | "tool";
interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}
interface ChatMessage {
  role: MessageRole;
  content: string | null;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
  name?: string;
}

const RUN_SQL_TOOL = {
  type: "function" as const,
  function: {
    name: "run_sql",
    description:
      "Run one or more read-only SQLite SELECT queries on the user's dataset (table name: 'data'). Use this to compute metrics, aggregates, filters, or explore the data. Each query must be a single SELECT statement. Before writing SQL, inspect the schema for case-insensitive duplicate column names (e.g. browse vs Browse); if present, reference only one per conflict or use aliases so every output column has a unique name. Avoid SELECT * when it would produce duplicate column names.",
    parameters: {
      type: "object",
      properties: {
        queries: {
          type: "array",
          items: { type: "string" },
          description: "List of SQLite SELECT queries. Use table 'data'. Alias aggregates (e.g. COUNT(*) AS count_x). Ensure unique output column names; if schema has case-insensitive duplicates, select only one of the conflicting columns or alias them.",
        },
      },
      required: ["queries"],
    },
  },
};

function buildSchemaDescription(data: ParsedData): string {
  const lines = data.columns.map((c) => {
    const t = data.columnTypes[c] ?? "string";
    return `  ${c} (${t})`;
  });
  const lowerToOriginals = new Map<string, string[]>();
  for (const c of data.columns) {
    const key = c.toLowerCase();
    if (!lowerToOriginals.has(key)) lowerToOriginals.set(key, []);
    lowerToOriginals.get(key)!.push(c);
  }
  const conflicts = Array.from(lowerToOriginals.values()).filter((arr) => arr.length > 1);
  let conflictNote = "";
  if (conflicts.length > 0) {
    conflictNote =
      "\n\n⚠️ Duplicate column names (case-insensitive): the following groups are treated as the same name by SQL. Reference only one per group or use aliases so output column names are unique.\n" +
      conflicts.map((g) => `  - ${g.join(" / ")}`).join("\n") +
      "\n";
  }
  return `Table name: "data"\nColumns:\n${lines.join("\n")}${conflictNote}`;
}

const SYSTEM_PROMPT = (schema: string) => `You are a business analyst. Answer the user's question using their dataset by calling the run_sql tool to execute SQL queries.

${schema}

Before writing any SQL query, inspect the schema and detect any conflicting column names. Some SQL engines treat names as case-insensitive (e.g. \`browse\` and \`Browse\` are the same), which can cause "duplicate column name" errors.

If duplicate column names exist (case-insensitive duplicates like \`browse\` and \`Browse\`):
1. Treat column names as case-insensitive when they conflict.
2. Do not reference both conflicting columns directly in a query.
3. Resolve the conflict by selecting only one column OR renaming them with aliases so output column names are unique.
4. Ensure every column in the SELECT result has a unique name.
5. Never produce SQL that results in duplicate output column names.
If a conflict exists, you may explain it briefly and generate corrected SQL that avoids the duplicate column problem.

Process:
1. Rephrase the question in analytical terms and identify required metrics.
2. Call run_sql with one or more SELECT queries. Use table "data". Double-quote column names with spaces (e.g. "column name"). Always alias aggregates (e.g. COUNT(*) AS total_count, SUM(revenue) AS total_revenue). Never duplicate output column names; use AS to give unique names.
3. After receiving query results, explain the result and provide business insight.

Rules:
- Never guess values not in the dataset. Always use run_sql to get numbers.
- If the schema is unclear, ask a short clarifying question instead of calling the tool.
- Important SQL rules: no duplicate column names (including case-insensitive); alias every aggregated column; avoid SELECT * if it would include duplicate column names; use explicit column names and aliases when necessary; ensure every output column has a unique name.`;

async function openRouterChatWithTools(
  apiKey: string,
  messages: ChatMessage[],
  tools: typeof RUN_SQL_TOOL[],
  maxTokens = 1024
): Promise<{ message: ChatMessage; finishReason: string }> {
  const body: Record<string, unknown> = {
    model: process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL,
    messages,
    max_tokens: maxTokens,
  };
  if (tools.length > 0) body.tools = tools;

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  const err = json.error?.message ?? (typeof json.error === "string" ? json.error : null);
  if (err) throw new Error(err);
  if (!res.ok) throw new Error(json.error?.message ?? res.statusText);

  const choice = json.choices?.[0];
  const msg = choice?.message ?? {};
  const finishReason = choice?.finish_reason ?? "stop";

  const assistantMessage: ChatMessage = {
    role: "assistant",
    content: msg.content ?? null,
    tool_calls: msg.tool_calls,
  };
  return { message: assistantMessage, finishReason };
}

async function executeRunSql(data: ParsedData, args: { queries?: string[] }): Promise<string> {
  const queries = args.queries;
  if (!Array.isArray(queries) || queries.length === 0) {
    return JSON.stringify({ error: "No queries provided. Pass an array of SQL SELECT strings." });
  }
  const trimmed = queries.map((q) => (typeof q === "string" ? q.trim() : "")).filter(Boolean);
  if (trimmed.length === 0) {
    return JSON.stringify({ error: "No valid query strings." });
  }
  try {
    const results = await runSelectsOnData(data, trimmed);
    const out = results.map(({ sql, rows }) => ({
      sql,
      rowCount: rows.length,
      rows: rows.slice(0, MAX_RESULT_ROWS_FOR_LLM),
      truncated: rows.length > MAX_RESULT_ROWS_FOR_LLM,
    }));
    return JSON.stringify(out, null, 2);
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Query failed";
    return JSON.stringify({ error: errMsg });
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY ?? DEFAULT_API_KEY;

    const body = await request.json();
    const messages: { role: string; content: string }[] = body.messages ?? [];
    const data: ParsedData | null = body.data ?? null;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }

    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content?.trim();
    if (!lastUserMessage) {
      return NextResponse.json({ error: "No user message found" }, { status: 400 });
    }

    if (!data || !data.rows.length) {
      const { message } = await openRouterChatWithTools(
        apiKey,
        [
          {
            role: "system",
            content:
              "You are a business analyst. The user has not loaded any dataset. Ask them to upload a file or connect a database first.",
          },
          { role: "user", content: lastUserMessage },
        ],
        []
      );
      return NextResponse.json({
        reply: (message.content ?? "").trim() || "Please load a dataset to continue.",
      });
    }

    const schema = buildSchemaDescription(data);
    const systemContent = SYSTEM_PROMPT(schema);

    const chatMessages: ChatMessage[] = [
      { role: "system", content: systemContent },
      { role: "user", content: lastUserMessage },
    ];

    const tools = [RUN_SQL_TOOL];
    let round = 0;
    let lastMessage: ChatMessage;

    while (round < MAX_TOOL_ROUNDS) {
      const { message, finishReason } = await openRouterChatWithTools(
        apiKey,
        chatMessages,
        tools,
        1536
      );
      lastMessage = message;
      chatMessages.push(message);

      if (finishReason !== "tool_calls" || !message.tool_calls?.length) {
        const reply = (message.content ?? "").trim();
        return NextResponse.json({
          reply: reply || "I couldn't produce an answer. Try rephrasing your question.",
        });
      }

      for (const tc of message.tool_calls) {
        if (tc.type !== "function" || tc.function?.name !== "run_sql") continue;
        let args: { queries?: string[] } = {};
        try {
          args = JSON.parse(tc.function.arguments || "{}");
        } catch {
          args = {};
        }
        const toolResult = await executeRunSql(data, args);
        chatMessages.push({
          role: "tool",
          content: toolResult,
          tool_call_id: tc.id,
        });
      }
      round++;
    }

    const finalSystem =
      systemContent +
      "\n\nYou have already received query results above. Provide a concise analytical answer based on them. Do not call any more tools.";
    const messagesForFinal: ChatMessage[] = [
      { role: "system", content: finalSystem },
      ...chatMessages.filter((m) => m.role !== "system"),
    ];
    try {
      const { message: finalMsg } = await openRouterChatWithTools(
        apiKey,
        messagesForFinal,
        [],
        1024
      );
      const reply = (finalMsg.content ?? "").trim();
      if (reply) return NextResponse.json({ reply });
    } catch {
      /* ignore */
    }
    const reply =
      (lastMessage!.content ?? "").trim() ||
      "I couldn't produce a final summary. Try rephrasing or a simpler question.";
    return NextResponse.json({ reply });
  } catch (e) {
    console.error("Chat API error:", e);
    const message = e instanceof Error ? e.message : "Chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
