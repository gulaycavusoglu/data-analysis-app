import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";

/** Large CSV parse + JSON response (adjust on Vercel if timeouts occur). */
export const maxDuration = 120;
import Papa from "papaparse";
import type { ParseResult } from "papaparse";
import * as XLSX from "xlsx";
import type { ParsedData } from "@/types";

/** UTF-8/UTF-16 + BOM — avoids misparsed lines when Excel exports wide CSV. */
function decodeTextFile(buffer: Buffer): string {
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(buffer.subarray(3));
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(buffer.subarray(2));
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(buffer.subarray(2));
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
}

function stripLeadingBom(text: string): string {
  return text.replace(/^\uFEFF/, "");
}

type CsvRow = Record<string, string>;

function scoreCsvParse(result: ParseResult<CsvRow>): number {
  const fieldCount = result.meta.fields?.length ?? 0;
  const rowCount = result.data.length;
  if (fieldCount < 1 || rowCount < 1) return Number.NEGATIVE_INFINITY;

  let extraFields = 0;
  for (const row of result.data) {
    const pe = row["__parsed_extra"];
    if (Array.isArray(pe)) extraFields += pe.length;
  }

  const mismatch = result.errors.filter(
    (e) => e.code === "TooManyFields" || e.code === "TooFewFields"
  ).length;

  const quoteErrors = result.errors.filter((e) => e.type === "Quotes").length;

  // Prefer multiple real columns, full row count, minimal structural errors.
  return fieldCount * 8_000 + rowCount - mismatch * 400 - extraFields * 600 - quoteErrors * 250;
}

/** Sniff delimiter on a prefix+suffix slice so large files are not parsed five times over. */
function csvDelimiterSample(raw: string): string {
  if (raw.length <= 800_000) return raw;
  return raw.slice(0, 500_000) + "\n" + raw.slice(-300_000);
}

/**
 * Pick delimiter using a sample, then parse the full file once (avoids 5× memory/CPU on big CSVs).
 * Wrong comma vs tab/semicolon often yields one column whose cells are whole lines.
 */
function parseCsvWithBestDelimiter(text: string): ParseResult<CsvRow> {
  const raw = stripLeadingBom(text);
  const transformHeader = (h: string) => h.replace(/^\uFEFF/, "").trim();
  const sample = csvDelimiterSample(raw);

  const delimiters: readonly (string | undefined)[] = [undefined, "\t", ";", ",", "|"];
  let bestDelim: string | undefined;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const delimiter of delimiters) {
    const probe = Papa.parse<CsvRow>(sample, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader,
      ...(delimiter !== undefined ? { delimiter } : {}),
    });
    const sc = scoreCsvParse(probe);
    if (sc > bestScore) {
      bestScore = sc;
      bestDelim = delimiter;
    }
  }

  return Papa.parse<CsvRow>(raw, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader,
    ...(bestDelim !== undefined ? { delimiter: bestDelim } : {}),
  });
}

/** Spread samples across the file so late columns/types are not missed on large CSVs. */
function sampleRowIndices(rowCount: number, maxSamples: number): number[] {
  if (rowCount <= 0) return [];
  if (rowCount <= maxSamples) return Array.from({ length: rowCount }, (_, i) => i);
  const out: number[] = [];
  const step = Math.max(1, Math.floor((rowCount - 1) / (maxSamples - 1)));
  for (let i = 0; i < rowCount; i += step) out.push(i);
  out.push(rowCount - 1);
  const uniq = Array.from(new Set(out)).sort((a, b) => a - b);
  return uniq.slice(0, maxSamples);
}

function inferType(value: string): "number" | "string" | "date" {
  if (value === "" || value == null) return "string";
  const trimmed = String(value).trim();
  if (/^-?\d+\.?\d*$/.test(trimmed) || /^-?\d*\.\d+$/.test(trimmed)) return "number";
  const d = new Date(trimmed);
  if (!Number.isNaN(d.getTime())) return "date";
  return "string";
}

function inferColumnTypes(rows: Record<string, string>[], columns: string[]): Record<string, "number" | "string" | "date"> {
  const types: Record<string, "number" | "string" | "date"> = {};
  const indices = sampleRowIndices(rows.length, 500);
  for (const col of columns) {
    const samples = indices.map((i) => rows[i]?.[col] ?? "").filter(Boolean);
    const typeCounts = { number: 0, string: 0, date: 0 };
    for (const s of samples) {
      const t = inferType(s);
      typeCounts[t]++;
    }
    const max = Math.max(typeCounts.number, typeCounts.string, typeCounts.date);
    if (max === 0) {
      types[col] = "string";
      continue;
    }
    if (max === typeCounts.number) types[col] = "number";
    else if (max === typeCounts.date) types[col] = "date";
    else types[col] = "string";
  }
  return types;
}

function normalizeRows(rows: Record<string, string>[], columnTypes: Record<string, "number" | "string" | "date">): Record<string, unknown>[] {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [col, type] of Object.entries(columnTypes)) {
      const raw = row[col] ?? "";
      if (raw === "" || raw == null) {
        out[col] = null;
        continue;
      }
      if (type === "number") {
        const n = Number(raw);
        out[col] = Number.isFinite(n) ? n : null;
      } else if (type === "date") {
        const d = new Date(raw);
        out[col] = Number.isNaN(d.getTime()) ? null : d.toISOString();
      } else out[col] = String(raw).trim();
    }
    return out;
  });
}

export async function POST(request: NextRequest) {
  try {
    const { unauthorized } = await requireAuth(request);
    if (unauthorized) return unauthorized;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const name = file.name.toLowerCase();
    const isCsv = name.endsWith(".csv");
    const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls");

    if (!isCsv && !isExcel) {
      return NextResponse.json(
        { error: "Unsupported format. Use CSV or Excel (.xlsx, .xls)." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let rows: Record<string, string>[];
    let columns: string[];

    if (isCsv) {
      const text = decodeTextFile(buffer);
      const result = parseCsvWithBestDelimiter(text);
      if (result.errors.length > 0 && result.data.length === 0) {
        return NextResponse.json(
          { error: "Failed to parse CSV: " + result.errors[0].message },
          { status: 400 }
        );
      }
      rows = result.data.filter((row) => row && Object.keys(row).length > 0);
      columns = result.meta.fields ?? (rows[0] ? Object.keys(rows[0]) : []);
    } else {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
      rows = json.map((r) => {
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(r)) {
          out[String(k)] = v == null ? "" : String(v);
        }
        return out;
      });
      columns = rows[0] ? Object.keys(rows[0]) : [];
    }

    if (columns.length === 0 || rows.length === 0) {
      return NextResponse.json(
        { error: "File has no columns or rows." },
        { status: 400 }
      );
    }

    const columnTypes = inferColumnTypes(rows, columns);
    const normalizedRows = normalizeRows(rows, columnTypes);

    const data: ParsedData = {
      columns,
      rows: normalizedRows,
      columnTypes,
    };

    return NextResponse.json(data);
  } catch (e) {
    console.error("Upload error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}
