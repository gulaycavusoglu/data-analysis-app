export type DataSourceType = "database" | "file";

export interface DatabaseConfig {
  type: "postgres" | "mysql";
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export interface ParsedData {
  columns: string[];
  rows: Record<string, unknown>[];
  columnTypes: Record<string, "number" | "string" | "date">;
}

export interface ColumnStats {
  name: string;
  type: "number" | "string" | "date";
  count: number;
  nullCount: number;
  uniqueCount?: number;
  min?: number;
  max?: number;
  mean?: number;
  sample?: string[];
}
