# Data Analysis Studio

Analyse data from **databases** (PostgreSQL, MySQL) or **files** (CSV, Excel). No need to install Node.js globally — this project includes its own.

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

## AI data analyst (chat)

The chat widget (bottom-right) uses **OpenRouter** (`https://openrouter.ai/api/v1/chat/completions`). Users can ask questions about their loaded dataset. The AI receives the schema, column statistics, and a sample of rows.

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

Next.js 14, React 18, TypeScript, Tailwind, PapaParse, xlsx, pg, mysql2, Recharts.
