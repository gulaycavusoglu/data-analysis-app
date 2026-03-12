import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import mysql from "mysql2/promise";
import type { ParsedData } from "@/types";

function inferColumnTypes(rows: Record<string, unknown>[]): Record<string, "number" | "string" | "date"> {
  if (rows.length === 0) return {};
  const columns = Object.keys(rows[0] ?? {});
  const types: Record<string, "number" | "string" | "date"> = {};
  for (const col of columns) {
    const samples = rows.slice(0, 100).map((r) => r[col]);
    let num = 0,
      str = 0,
      date = 0;
    for (const v of samples) {
      if (v == null) continue;
      if (typeof v === "number" && !Number.isNaN(v)) num++;
      else if (v instanceof Date || (typeof v === "string" && !Number.isNaN(new Date(v).getTime()))) date++;
      else str++;
    }
    const max = Math.max(num, str, date);
    if (max === num) types[col] = "number";
    else if (max === date) types[col] = "date";
    else types[col] = "string";
  }
  return types;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, host, port, database, user, password, query } = body as {
      type: "postgres" | "mysql";
      host: string;
      port: number;
      database: string;
      user: string;
      password: string;
      query: string;
    };

    if (!type || !host || !database || !user || !query?.trim()) {
      return NextResponse.json(
        { error: "Missing required fields: type, host, database, user, query" },
        { status: 400 }
      );
    }

    const portNum = Number(port) || (type === "postgres" ? 5432 : 3306);
    const sql = query.trim();
    const upper = sql.toUpperCase();
    if (!upper.startsWith("SELECT ")) {
      return NextResponse.json(
        { error: "Only SELECT queries are allowed." },
        { status: 400 }
      );
    }

    let rows: Record<string, unknown>[];
    let columns: string[];

    if (type === "postgres") {
      const pool = new Pool({
        host,
        port: portNum,
        database,
        user,
        password: password || undefined,
      });
      try {
        const result = await pool.query(sql);
        rows = (result.rows as Record<string, unknown>[]) ?? [];
        columns = result.fields?.map((f) => f.name) ?? (rows[0] ? Object.keys(rows[0]) : []);
      } finally {
        await pool.end();
      }
    } else {
      const conn = await mysql.createConnection({
        host,
        port: portNum,
        database,
        user,
        password: password || undefined,
      });
      try {
        const [rawRows] = await conn.query(sql);
        const arr = Array.isArray(rawRows) ? rawRows : [];
        rows = arr as Record<string, unknown>[];
        columns = rows[0] ? Object.keys(rows[0]) : [];
      } finally {
        await conn.end();
      }
    }

    const columnTypes = inferColumnTypes(rows);
    const data: ParsedData = {
      columns,
      rows,
      columnTypes,
    };

    return NextResponse.json(data);
  } catch (e) {
    console.error("Query error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Query failed" },
      { status: 500 }
    );
  }
}
