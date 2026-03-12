"use client";

import { useState } from "react";
import DatabaseForm from "./DatabaseForm";
import FileUpload from "./FileUpload";
import type { ParsedData } from "@/types";

type Tab = "database" | "file";

interface DataSourcePickerProps {
  onDataLoaded: (data: ParsedData) => void;
  loading: boolean;
  onLoadingChange?: (loading: boolean) => void;
}

export default function DataSourcePicker({ onDataLoaded, loading, onLoadingChange }: DataSourcePickerProps) {
  const [tab, setTab] = useState<Tab>("file");

  return (
    <div className="card-interactive p-6 shadow-xl">
      <div className="mb-6 flex gap-2 border-b border-[var(--border)] pb-4">
        <button
          type="button"
          onClick={() => setTab("file")}
          className={`rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
            tab === "file"
              ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/25"
              : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
          }`}
        >
          CSV / Excel
        </button>
        <button
          type="button"
          onClick={() => setTab("database")}
          className={`rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
            tab === "database"
              ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/25"
              : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
          }`}
        >
          Database
        </button>
      </div>
      {tab === "file" && (
        <FileUpload onDataLoaded={onDataLoaded} loading={loading} onLoadingChange={onLoadingChange} />
      )}
      {tab === "database" && (
        <DatabaseForm onDataLoaded={onDataLoaded} loading={loading} onLoadingChange={onLoadingChange} />
      )}
    </div>
  );
}
