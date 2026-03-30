import Database from "better-sqlite3";
import type { ParsedData } from "@/types";

/** Escape column name for SQLite (double-quoted identifier). */
function quoteColumn(name: string): string {
  return '"' + String(name).replace(/"/g, '""') + '"';
}

/**
 * Build SQLite-safe unique column names from possibly duplicate (case-insensitive) names.
 * First occurrence keeps its name; subsequent duplicates get _2, _3, etc.
 * Returns the names to use in the table and, for each, the original column key for row lookup.
 */
export function getUniqueColumnNames(columns: string[]): {
  uniqueNames: string[];
  originalByUnique: string[];
} {
  const seenLower = new Map<string, number>();
  const uniqueNames: string[] = [];
  const originalByUnique: string[] = [];
  for (const c of columns) {
    const key = c.toLowerCase();
    const count = (seenLower.get(key) ?? 0) + 1;
    seenLower.set(key, count);
    const uniqueName = count === 1 ? c : `${c}_${count}`;
    uniqueNames.push(uniqueName);
    originalByUnique.push(c);
  }
  return { uniqueNames, originalByUnique };
}

/** Only allow a single SELECT statement per call; reject other SQL. */
function isAllowedQuery(sql: string): boolean {
  const trimmed = sql.trim().toUpperCase();
  if (!trimmed.startsWith("SELECT")) return false;
  if (trimmed.includes(";")) {
    const parts = trimmed.split(";").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1) return false;
  }
  const forbidden = ["INSERT", "UPDATE", "DELETE", "DROP", "CREATE", "ALTER", "TRUNCATE", "--", "/*"];
  const upper = sql.toUpperCase();
  for (const word of forbidden) {
    if (upper.includes(word)) return false;
  }
  return true;
}

/** Run a SELECT query on in-memory data. Returns array of row objects. */
export async function runSelectOnData(data: ParsedData, sql: string): Promise<Record<string, unknown>[]> {
  const results = await runSelectsOnData(data, [sql]);
  return results[0]?.rows ?? [];
}

/** Create in-memory DB once, run multiple SELECTs, return result sets. */
export async function runSelectsOnData(
  data: ParsedData,
  sqlList: string[]
): Promise<Array<{ sql: string; rows: Record<string, unknown>[] }>> {
  const trimmedList = sqlList.map((s) => s.trim()).filter(Boolean);
  for (const sql of trimmedList) {
    if (!isAllowedQuery(sql)) throw new Error("Only SELECT queries are allowed.");
  }

  const db = new Database(":memory:");
  try {
    const { uniqueNames, originalByUnique } = getUniqueColumnNames(data.columns);
    const types = data.columnTypes;
    const columnDefs = uniqueNames
      .map((name, i) => {
        const orig = originalByUnique[i];
        const t = types[orig] ?? "string";
        const sqlType = t === "number" ? "REAL" : "TEXT";
        return `${quoteColumn(name)} ${sqlType}`;
      })
      .join(", ");
    db.exec(`CREATE TABLE data (${columnDefs})`);

    const placeholders = uniqueNames.map(() => "?").join(", ");
    const insertSql = `INSERT INTO data (${uniqueNames.map(quoteColumn).join(", ")}) VALUES (${placeholders})`;
    const insert = db.prepare(insertSql);

    for (const row of data.rows) {
      const values = originalByUnique.map((c) => {
        const v = row[c];
        if (v == null) return null;
        if (typeof v === "number" && !Number.isNaN(v)) return v;
        if (v instanceof Date) {
          return Number.isNaN(v.getTime()) ? null : v.toISOString();
        }
        return String(v);
      });
      insert.run(...values);
    }

    const out: Array<{ sql: string; rows: Record<string, unknown>[] }> = [];
    for (const sql of trimmedList) {
      const rows = db.prepare(sql).all() as Record<string, unknown>[];
      out.push({ sql, rows });
    }
    return out;
  } finally {
    db.close();
  }
}
