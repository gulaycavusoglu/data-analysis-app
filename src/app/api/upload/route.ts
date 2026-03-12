import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { ParsedData } from "@/types";

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
  for (const col of columns) {
    const samples = rows.slice(0, 100).map((r) => r[col] ?? "").filter(Boolean);
    const typeCounts = { number: 0, string: 0, date: 0 };
    for (const s of samples) {
      const t = inferType(s);
      typeCounts[t]++;
    }
    const max = Math.max(typeCounts.number, typeCounts.string, typeCounts.date);
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
      if (type === "number") out[col] = Number(raw);
      else if (type === "date") out[col] = new Date(raw).toISOString();
      else out[col] = String(raw).trim();
    }
    return out;
  });
}

export async function POST(request: NextRequest) {
  try {
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
      const text = new TextDecoder().decode(buffer);
      const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
      if (result.errors.length > 0 && result.data.length === 0) {
        return NextResponse.json(
          { error: "Failed to parse CSV: " + result.errors[0].message },
          { status: 400 }
        );
      }
      rows = result.data;
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
