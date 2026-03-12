import type { ParsedData, ColumnStats } from "@/types";

export function computeColumnStats(data: ParsedData): ColumnStats[] {
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

/**
 * Build a text summary of the dataset for the AI context.
 * @param data - Parsed dataset
 * @param options - sampleRows: max rows to include; maxChars: hard cap on output length (for token‑limited APIs, e.g. ~2000 for 1024-token context)
 */
export function buildDataContextForAI(
  data: ParsedData,
  options: { sampleRows?: number; maxChars?: number } = {}
): string {
  const { sampleRows = 100, maxChars } = options;
  const stats = computeColumnStats(data);

  // Compact format to stay within token limits (e.g. Freya 1024)
  const compact = typeof maxChars === "number" && maxChars > 0;
  const budget = compact ? maxChars : 1_000_000;

  const parts: string[] = [];
  let len = 0;

  const add = (s: string) => {
    if (len + s.length <= budget) {
      parts.push(s);
      len += s.length;
    }
  };

  add("Schema: " + data.columns.map((c) => c + "(" + (data.columnTypes[c] ?? "string") + ")").join(", ") + "\n");
  add("Stats: ");
  const statLines = stats.map((s) => {
    const uniqVal = s.uniqueCount ?? "-";
    let line = s.name + ": n=" + s.count + ", nulls=" + s.nullCount + ", uniq=" + uniqVal;
    if (s.min != null) line += ", min=" + s.min + ", max=" + s.max + ", mean=" + s.mean;
    if (s.sample?.length) line += ", sample=[" + s.sample.slice(0, 3).join(", ") + "]";
    return line;
  });
  add(statLines.join("; ") + "\n");

  if (compact) {
    const sample = data.rows.slice(0, 5);
    const sampleStr = JSON.stringify(sample).slice(0, budget - len - 60);
    add("Sample (" + data.rows.length + " rows total): " + sampleStr);
  } else {
    const sample = data.rows.slice(0, sampleRows);
    add("Sample rows (first " + sample.length + " of " + data.rows.length + "):\n");
    add(JSON.stringify(sample, null, 0).slice(0, Math.min(12000, budget - len)));
  }

  return parts.join("");
}
