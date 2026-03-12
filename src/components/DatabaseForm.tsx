"use client";

import { useState } from "react";
import type { ParsedData } from "@/types";
import type { DatabaseConfig } from "@/types";

interface DatabaseFormProps {
  onDataLoaded: (data: ParsedData) => void;
  loading: boolean;
  onLoadingChange?: (loading: boolean) => void;
}

export default function DatabaseForm({ onDataLoaded, loading, onLoadingChange }: DatabaseFormProps) {
  const [config, setConfig] = useState<DatabaseConfig>({
    type: "postgres",
    host: "localhost",
    port: 5432,
    database: "",
    user: "",
    password: "",
  });
  const [query, setQuery] = useState("SELECT * FROM your_table LIMIT 1000");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    onLoadingChange?.(true);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: config.type,
          host: config.host,
          port: config.port,
          database: config.database,
          user: config.user,
          password: config.password,
          query,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Query failed");
      onDataLoaded(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      onLoadingChange?.(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--text-muted)]">
            Database type
          </label>
          <select
            value={config.type}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                type: e.target.value as "postgres" | "mysql",
                port: e.target.value === "mysql" ? 3306 : 5432,
              }))
            }
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          >
            <option value="postgres">PostgreSQL</option>
            <option value="mysql">MySQL</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--text-muted)]">
            Host
          </label>
          <input
            type="text"
            value={config.host}
            onChange={(e) => setConfig((c) => ({ ...c, host: e.target.value }))}
            placeholder="localhost"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--text-muted)]">
            Port
          </label>
          <input
            type="number"
            value={config.port}
            onChange={(e) => setConfig((c) => ({ ...c, port: Number(e.target.value) || 5432 }))}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--text-muted)]">
            Database name
          </label>
          <input
            type="text"
            value={config.database}
            onChange={(e) => setConfig((c) => ({ ...c, database: e.target.value }))}
            placeholder="mydb"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--text-muted)]">
            User
          </label>
          <input
            type="text"
            value={config.user}
            onChange={(e) => setConfig((c) => ({ ...c, user: e.target.value }))}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--text-muted)]">
            Password
          </label>
          <input
            type="password"
            value={config.password}
            onChange={(e) => setConfig((c) => ({ ...c, password: e.target.value }))}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--text-muted)]">
          SQL query (SELECT only)
        </label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          required
        />
      </div>
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
      >
        {loading ? "Loading…" : "Run query"}
      </button>
    </form>
  );
}
