# Data Analysis Studio

This project was built using **Cursor** for exploration and development.

Analyse data from **databases** (PostgreSQL, MySQL) or **files** (CSV, Excel). No need to install Node.js globally — this project includes its own.

---

## ✨ Features

- **Multiple data sources** — Upload CSV or Excel (`.csv`, `.xlsx`, `.xls`) or connect **PostgreSQL** or **MySQL** and run a SELECT query to load results.
- **No global Node.js required** — Run with `bash run.sh`; the project bundles Node in `.node/` and uses a local npm cache.
- **Automatic column stats** — Per-column summary: count, nulls, unique values, min/max/mean for numbers, sample values for text.
- **Charts** — Bar and pie charts; pick category and value columns to visualise your data.
- **Paginated data table** — Scroll and page through your dataset with a clean, sortable preview.
- **AI data analyst (chat)** — Always-visible chat widget (bottom-right) to ask business questions in plain language. Answers are based on your **full dataset**, not a sample.
- **SQL over your data** — The AI uses **tool calling**: it writes SQL, we run it in-memory (better-sqlite3) on your loaded data, and it explains results and gives insights.
- **Business analyst workflow** — The AI rephrases your question, identifies metrics, runs one or more SELECT queries, explains the result, and provides business insight. It never guesses; it computes from the data.
- **Schema-aware SQL** — Detects case-insensitive duplicate column names (e.g. `browse` vs `Browse`) and guides the AI to avoid “duplicate column name” errors. Unique output column names and explicit aliases for aggregates.
- **OpenRouter** — Use many LLM providers (GPT, Claude, etc.) via one API; set `OPENROUTER_API_KEY` and optionally `OPENROUTER_MODEL` in `.env.local`.
- **Interactive landing page** — Hero section, gradient background, feature pills, and clear “get started” flow when no data is loaded.
- **Dark theme** — Consistent, readable UI with CSS variables and Tailwind.
- **TypeScript & modern stack** — Next.js 14, React 18, Tailwind, Recharts, PapaParse, xlsx, pg, mysql2, better-sqlite3.

---

## Run the app (no global npm/node needed)

From the project folder:

```bash
cd /Users/gulay/data-analysis-app
bash run.sh
```

Then open **http://localhost:3000**.

- `bash run.sh` — start dev server
- `bash run.sh build` — production build
- `bash run.sh start` — run production build (run `build` first)

## What’s included

- **Node.js** in `.node/` (v20) and **npm cache** in `.npm-cache/` so you don’t need to install Node system-wide.
- **File upload**: CSV (`.csv`), Excel (`.xlsx`, `.xls`).
- **Database**: PostgreSQL or MySQL; run a **SELECT** query to load results.
- **Summary**: Per-column stats (count, nulls, unique, min/max/mean, samples).
- **Charts**: Bar and pie; choose category and value columns.
- **Data table**: Paginated preview.
- **Ask the AI analyst**: After loading data, use the chat (bottom-right) to ask questions (summaries, averages, distributions, insights). Uses **OpenRouter** (many models: GPT, Claude, etc.).

## Your data

Use your own data by uploading CSV/Excel files or connecting a database. You can keep sample or local files in a `data/` folder in the project if you like; the app does not read from the filesystem by default—you upload or connect via the UI.

## AI data analyst (chat)

The chat widget (bottom-right) uses **OpenRouter** (`https://openrouter.ai/api/v1/chat/completions`). Users can ask questions about their loaded dataset. The AI runs SQL over your full dataset via tool calling and returns analytical answers.

A default API key is configured. To use your own:

1. Create `.env.local` in the project root.
2. Add your OpenRouter API key:
   ```
   OPENROUTER_API_KEY=sk-or-v1-...
   ```
3. Optional: choose a model (default is `openai/gpt-3.5-turbo`):
   ```
   OPENROUTER_MODEL=anthropic/claude-3-haiku
   ```

Restart the dev server after changing env.

## If you later install Node globally

You can use npm as usual:

```bash
export NPM_CONFIG_CACHE="$(pwd)/.npm-cache"   # optional, if you had cache issues
npm install
npm run dev
```

## Tech

Next.js 14, React 18, TypeScript, Tailwind, PapaParse, xlsx, pg, mysql2, Recharts, better-sqlite3 (in-memory SQL for the AI analyst).
