"use client";

import { useState } from "react";
import DataSourcePicker from "@/components/DataSourcePicker";
import DataTable from "@/components/DataTable";
import SummaryStats from "@/components/SummaryStats";
import ChartPanel from "@/components/ChartPanel";
import ChatWidget from "@/components/ChatWidget";
import type { ParsedData } from "@/types";

export default function Home() {
  const [data, setData] = useState<ParsedData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDataLoaded = (parsed: ParsedData) => {
    setData(parsed);
  };

  const isLanding = !data;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md px-6 py-4 transition-shadow duration-300 hover:shadow-lg hover:shadow-black/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--text)] sm:text-2xl">
              Data Analysis Studio
            </h1>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">
              Connect a database or upload CSV/Excel to explore and analyse your data
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {isLanding ? (
          <div className="landing-gradient min-h-[calc(100vh-12rem)]">
            {/* Hero */}
            <div className="pt-12 pb-16 text-center animate-fade-in">
              <h2 className="hero-headline text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Analyse data in minutes
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--text-muted)] animate-fade-in-up animate-delay-100">
                Upload a file or connect your database. Get summaries, charts, and ask the AI analyst—all in one place.
              </p>
            </div>

            {/* Feature pills */}
            <div className="mb-14 flex flex-wrap justify-center gap-3 animate-fade-in-up animate-delay-200">
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface)]/80 px-4 py-2 text-sm text-[var(--text-muted)] backdrop-blur-sm transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--text)]">
                CSV & Excel
              </span>
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface)]/80 px-4 py-2 text-sm text-[var(--text-muted)] backdrop-blur-sm transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--text)]">
                PostgreSQL & MySQL
              </span>
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface)]/80 px-4 py-2 text-sm text-[var(--text-muted)] backdrop-blur-sm transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--text)]">
                Charts & stats
              </span>
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface)]/80 px-4 py-2 text-sm text-[var(--text-muted)] backdrop-blur-sm transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--text)]">
                AI analyst chat
              </span>
            </div>

            {/* CTA card - data source picker */}
            <div className="mx-auto max-w-2xl animate-fade-in-up animate-delay-300">
              <p className="mb-4 text-center text-sm font-medium text-[var(--text-muted)]">
                Get started — upload or connect below
              </p>
              <DataSourcePicker
                onDataLoaded={handleDataLoaded}
                loading={loading}
                onLoadingChange={setLoading}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center gap-2 text-sm text-[var(--text-muted)] animate-fade-in">
              <span className="rounded-full bg-[var(--success)]/20 px-3 py-1 text-[var(--success)]">
                {data.rows.length} rows
              </span>
              <span>{data.columns.length} columns</span>
            </div>

            <section className="mb-10 animate-fade-in-up">
              <h2 className="mb-4 text-lg font-semibold text-[var(--text)]">
                Summary
              </h2>
              <SummaryStats data={data} />
            </section>

            <section className="mb-10 animate-fade-in-up animate-delay-100">
              <h2 className="mb-4 text-lg font-semibold text-[var(--text)]">
                Visualise
              </h2>
              <ChartPanel data={data} />
            </section>

            <section className="animate-fade-in-up animate-delay-200">
              <h2 className="mb-4 text-lg font-semibold text-[var(--text)]">
                Data preview
              </h2>
              <DataTable data={data} />
            </section>
          </>
        )}
      </main>

      <ChatWidget data={data} />
    </div>
  );
}
