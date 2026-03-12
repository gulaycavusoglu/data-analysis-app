"use client";

import { useState, useRef, useEffect } from "react";
import type { ParsedData } from "@/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface DataAnalysisChatProps {
  data: ParsedData | null;
  /** When true, used inside ChatWidget: no outer header, compact layout */
  embedded?: boolean;
}

export default function DataAnalysisChat({ data, embedded = false }: DataAnalysisChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
          data,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Something went wrong");
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: json.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get response");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col overflow-hidden ${embedded ? "min-h-0 h-full" : "rounded-xl border border-[var(--border)] bg-[var(--surface)]"}`}>
      {!embedded && (
        <div className="border-b border-[var(--border)] px-4 py-3">
          <h3 className="text-lg font-semibold text-[var(--text)]">Ask about your data</h3>
          <p className="text-sm text-[var(--text-muted)]">
            {data
              ? `Dataset: ${data.rows.length} rows, ${data.columns.length} columns. Ask for summaries, trends, or insights.`
              : "Load a dataset above to chat with the AI analyst."}
          </p>
        </div>
      )}

      <div
        ref={listRef}
        className={`flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4 ${embedded ? "min-h-[200px]" : "min-h-[240px] max-h-[400px]"}`}
      >
        {messages.length === 0 && !loading && (
          <div className="text-sm text-[var(--text-muted)] text-center py-8">
            {data ? (
              <>
                <p className="mb-2">Try asking:</p>
                <ul className="space-y-1 text-left max-w-sm mx-auto">
                  <li>• What are the main columns and what do they mean?</li>
                  <li>• What is the average of [numeric column]?</li>
                  <li>• Summarise the distribution of [column].</li>
                  <li>• Are there any outliers or missing values?</li>
                </ul>
              </>
            ) : (
              <p>Upload a file or connect a database, then come back here to ask questions.</p>
            )}
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--bg)] border border-[var(--border)] text-[var(--text)]"
              }`}
            >
              <div className="whitespace-pre-wrap break-words">{m.content}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg px-4 py-2.5 text-sm bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)]">
              Thinking…
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-lg px-4 py-2 bg-[var(--warning)]/20 text-[var(--warning)] text-sm">
            {error}
          </div>
        )}
      </div>

      {data && (
        <form onSubmit={handleSubmit} className="border-t border-[var(--border)] p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your data…"
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
