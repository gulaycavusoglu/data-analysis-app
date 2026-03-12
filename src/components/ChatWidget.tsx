"use client";

import { useState } from "react";
import DataAnalysisChat from "@/components/DataAnalysisChat";
import type { ParsedData } from "@/types";

interface ChatWidgetProps {
  data: ParsedData | null;
}

export default function ChatWidget({ data }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Popup panel - fixed bottom-right, above the trigger button */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 flex w-[380px] max-w-[calc(100vw-3rem)] flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden"
          style={{ maxHeight: "min(560px, calc(100vh - 8rem))" }}
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 shrink-0">
            <div>
              <h3 className="text-base font-semibold text-[var(--text)]">AI Data Analyst</h3>
              <p className="text-xs text-[var(--text-muted)]">
                {data ? `${data.rows.length} rows · ${data.columns.length} cols` : "Load data to start"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--border)] hover:text-[var(--text)] transition-colors"
              aria-label="Close chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 min-h-0 flex flex-col">
            <DataAnalysisChat data={data} embedded />
          </div>
        </div>
      )}

      {/* Always-visible trigger button - bottom right */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg hover:bg-[var(--accent-hover)] hover:scale-105 active:scale-95 transition-all"
        aria-label={open ? "Close chat" : "Open AI analyst chat"}
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>
    </>
  );
}
