"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { ParsedData } from "@/types";

const COLORS = ["#3b82f6", "#22c55e", "#eab308", "#ef4444", "#8b5cf6", "#ec4899"];

interface ChartPanelProps {
  data: ParsedData;
}

export default function ChartPanel({ data }: ChartPanelProps) {
  const [xCol, setXCol] = useState<string>(data.columns[0] ?? "");
  const [yCol, setYCol] = useState<string>(
    data.columns.find((c) => data.columnTypes[c] === "number") ?? data.columns[1] ?? ""
  );
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");

  const chartData = useMemo(() => {
    if (!xCol) return [];
    if (chartType === "pie") {
      const counts: Record<string, number> = {};
      for (const row of data.rows) {
        const key = String(row[xCol] ?? "null");
        counts[key] = (counts[key] ?? 0) + 1;
      }
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }
    const agg: Record<string, number> = {};
    const yNum = data.columnTypes[yCol] === "number";
    for (const row of data.rows) {
      const x = String(row[xCol] ?? "null");
      const y = yNum ? Number(row[yCol]) : 1;
      if (!Number.isNaN(y)) agg[x] = (agg[x] ?? 0) + (yNum ? y : 1);
    }
    return Object.entries(agg)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 20);
  }, [data, xCol, yCol, chartType]);

  if (data.columns.length === 0) return null;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <h3 className="mb-4 text-lg font-semibold text-[var(--text)]">
        Charts
      </h3>
      <div className="mb-4 flex flex-wrap gap-4">
        <div>
          <label className="mb-1 block text-xs text-[var(--text-muted)]">
            Chart type
          </label>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as "bar" | "pie")}
            className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--text)]"
          >
            <option value="bar">Bar</option>
            <option value="pie">Pie</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--text-muted)]">
            Category (X)
          </label>
          <select
            value={xCol}
            onChange={(e) => setXCol(e.target.value)}
            className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--text)]"
          >
            {data.columns.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        {chartType === "bar" && (
          <div>
            <label className="mb-1 block text-xs text-[var(--text-muted)]">
              Value (Y)
            </label>
            <select
              value={yCol}
              onChange={(e) => setYCol(e.target.value)}
              className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--text)]"
            >
              {data.columns.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="h-[320px] w-full">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[var(--text-muted)]">
            No data to plot
          </div>
        ) : chartType === "pie" ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "var(--text)" }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="name"
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "var(--text)" }}
              />
              <Bar dataKey="value" fill="var(--accent)" name={yCol} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
