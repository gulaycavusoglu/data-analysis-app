"use client";

import { useCallback, useState } from "react";
import type { ParsedData } from "@/types";

interface FileUploadProps {
  onDataLoaded: (data: ParsedData) => void;
  loading: boolean;
  onLoadingChange?: (loading: boolean) => void;
}

export default function FileUpload({ onDataLoaded, loading, onLoadingChange }: FileUploadProps) {
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      onLoadingChange?.(true);
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        onDataLoaded(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        onLoadingChange?.(false);
      }
    },
    [onDataLoaded, onLoadingChange]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDrag(true);
  }, []);

  const onDragLeave = useCallback(() => setDrag(false), []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile]
  );

  return (
    <div className="space-y-4">
      <label
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`group flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200 ${
          drag
            ? "border-[var(--accent)] bg-[var(--accent)]/15 scale-[1.02] shadow-inner"
            : "border-[var(--border)] bg-[var(--bg)]/50 hover:border-[var(--accent)]/50 hover:bg-[var(--surface-hover)]/50"
        } ${loading ? "pointer-events-none opacity-70" : ""}`}
      >
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={onInputChange}
          className="hidden"
          disabled={loading}
        />
        <span className="mb-3 text-5xl opacity-80 transition-transform duration-200 group-hover:scale-110">📊</span>
        <span className="text-[var(--text-muted)] font-medium">
          Drop CSV or Excel here, or click to browse
        </span>
        <span className="mt-2 text-xs text-[var(--text-muted)]/80">
          .csv, .xlsx, .xls
        </span>
      </label>
      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
