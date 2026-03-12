"use client";

import { useMemo, useState } from "react";
import type { ParsedData } from "@/types";

interface DataTableProps {
  data: ParsedData;
  maxRows?: number;
}

export default function DataTable({ data, maxRows = 100 }: DataTableProps) {
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const totalPages = Math.ceil(Math.min(data.rows.length, maxRows) / pageSize);
  const start = page * pageSize;
  const slice = useMemo(
    () => data.rows.slice(start, start + pageSize),
    [data.rows, start, pageSize]
  );

  const formatCell = (value: unknown, type: string): string => {
    if (value == null) return "—";
    if (type === "date" && typeof value === "string") {
      try {
        return new Date(value).toLocaleDateString();
      } catch {
        return String(value);
      }
    }
    if (typeof value === "number" && !Number.isInteger(value)) {
      return Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 });
    }
    return String(value);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[600px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
              {data.columns.map((col) => (
                <th
                  key={col}
                  className="whitespace-nowrap px-4 py-3 font-medium text-[var(--text-muted)]"
                >
                  {col}
                  <span className="ml-1 text-xs font-normal opacity-70">
                    ({data.columnTypes[col] ?? "string"})
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((row, i) => (
              <tr
                key={start + i}
                className="border-b border-[var(--border)]/50 hover:bg-[var(--border)]/20"
              >
                {data.columns.map((col) => (
                  <td
                    key={col}
                    className="max-w-[200px] truncate px-4 py-2 text-[var(--text)]"
                    title={String(row[col] ?? "")}
                  >
                    {formatCell(row[col], data.columnTypes[col] ?? "string")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-2">
          <span className="text-sm text-[var(--text-muted)]">
            Rows {start + 1}–{Math.min(start + pageSize, data.rows.length)} of{" "}
            {Math.min(data.rows.length, maxRows)}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded border border-[var(--border)] px-3 py-1 text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded border border-[var(--border)] px-3 py-1 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
