"use client";

import { useMemo } from "react";
import type { ParsedData } from "@/types";
import type { ColumnStats } from "@/types";

function computeStats(data: ParsedData): ColumnStats[] {
  return data.columns.map((name) => {
    const type = data.columnTypes[name] ?? "string";
    const values = data.rows.map((r) => r[name]).filter((v) => v != null && v !== "");
    const count = data.rows.length;
    const nullCount = count - values.length;
    const numValues = values.filter((v) => typeof v === "number" && !Number.isNaN(v)) as number[];
    const uniq = new Set(values.map(String));
    const stats: ColumnStats = {
      name,
      type,
      count,
      nullCount,
      uniqueCount: uniq.size,
    };
    if (type === "number" && numValues.length > 0) {
      const sorted = [...numValues].sort((a, b) => a - b);
      stats.min = sorted[0];
      stats.max = sorted[sorted.length - 1];
      stats.mean = numValues.reduce((a, b) => a + b, 0) / numValues.length;
    }
    if (type === "string" && values.length > 0) {
      stats.sample = Array.from(uniq).slice(0, 5).map(String);
    }
    return stats;
  });
}

interface SummaryStatsProps {
  data: ParsedData;
}

export default function SummaryStats({ data }: SummaryStatsProps) {
  const stats = useMemo(() => computeStats(data), [data]);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <h3 className="mb-4 text-lg font-semibold text-[var(--text)]">
        Column summary
      </h3>
      <div className="space-y-4">
        {stats.map((s) => (
          <div
            key={s.name}
            className="rounded-lg border border-[var(--border)]/50 bg-[var(--bg)] p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-[var(--text)]">{s.name}</span>
              <span className="rounded bg-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
                {s.type}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div>
                <span className="text-[var(--text-muted)]">Count</span>
                <p className="font-mono">{s.count}</p>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Nulls</span>
                <p className="font-mono">{s.nullCount}</p>
              </div>
              {s.uniqueCount != null && (
                <div>
                  <span className="text-[var(--text-muted)]">Unique</span>
                  <p className="font-mono">{s.uniqueCount}</p>
                </div>
              )}
              {s.mean != null && (
                <>
                  <div>
                    <span className="text-[var(--text-muted)]">Min</span>
                    <p className="font-mono">{Number(s.min).toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">Max</span>
                    <p className="font-mono">{Number(s.max).toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">Mean</span>
                    <p className="font-mono">{Number(s.mean).toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
                  </div>
                </>
              )}
            </div>
            {s.sample != null && s.sample.length > 0 && (
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Sample: {s.sample.join(", ")}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
