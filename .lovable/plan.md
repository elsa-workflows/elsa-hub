
## Goal

Extend the Copilot knowledge base beyond the current site copy + catalog so it can answer real questions about Elsa Workflows itself. Two new source types:

1. `docs` — pages from `docs.elsaworkflows.io`, crawled with Firecrawl.
2. `code` — markdown files (`README.md`, `*.md`) from the public GitHub repos:
   `elsa-workflows/elsa`, `elsa-workflows/elsa-studio`, `elsa-workflows/elsa-samples`.

Both sources flow through the same `copilot_documents` table + `searchKnowledge` tool the Copilot already uses. Refresh is supported manually (admin button) and nightly (pg_cron).

## What changes

### 1. Database (one migration)

- Extend `copilot_documents.source` allowed values to include `docs` and `code` (drop + recreate the check constraint, or relax it).
- Add columns to support chunking + change detection:
  - `chunk_index INT NOT NULL DEFAULT 0`
  - `content_hash TEXT` (sha-256 of the chunk body; skip re-embedding when unchanged)
  - `repo TEXT NULL`, `path TEXT NULL`, `commit_sha TEXT NULL` (code only)
- Replace the existing `(source, external_id)` unique constraint with `(source, external_id, chunk_index)` so a long page can store multiple chunks.
- Bump `match_copilot_documents` RPC's `source_filter` to accept the new values (the function already filters by text, no signature change — just verify).
- Add an index on `(source, updated_at)` for incremental refresh queries.

### 2. Connectors

- Connect the **Firecrawl** connector via `standard_connectors--connect` (gateway-disabled connector → use `FIRECRAWL_API_KEY` directly).
- No GitHub connector needed: public repos are reachable through the unauthenticated GitHub REST + raw URLs. Add an optional `GITHUB_TOKEN` secret later only if we hit rate limits (60 req/h unauthenticated, 5000 authenticated).

### 3. New shared helpers in `supabase/functions/_shared/`

- `chunk.ts` — markdown-aware chunker (split on `##`/`###` headings; hard cap ~1,200 tokens ≈ 4,800 chars; carry the page title into every chunk's embedding text).
- `hash.ts` — `sha256Hex(string)` using Web Crypto.
- `firecrawl.ts` — thin wrappers: `firecrawlMap(url)`, `firecrawlScrape(url, formats=['markdown'])`. Uses `FIRECRAWL_API_KEY` directly per the Firecrawl skill notes.
- `github-md.ts` — list markdown files in a public repo via `GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1`, then fetch each file via `https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}`. Records the tree's commit SHA so we only re-embed when SHA changes.

### 4. Refactor `supabase/functions/copilot-ingest/index.ts`

- Accept an optional JSON body: `{ sources?: ("page"|"faq"|"db"|"catalog"|"docs"|"code")[] }`. Default = all.
- Keep the current PAGE/FAQ/DB/catalog flow; add two new builders:
  - `buildDocsDocs()` — Firecrawl `/map` on `https://docs.elsaworkflows.io`, then `/scrape` each URL (cap configurable, default 200). Returns one `Doc` per markdown chunk with `source: "docs"`, `external_id: docs:{path}`, `metadata: { section, breadcrumbs }`.
  - `buildCodeDocs()` — for each repo (`elsa`, `elsa-studio`, `elsa-samples`) under `elsa-workflows`, list `*.md`, fetch raw, chunk, `source: "code"`, `external_id: code:{repo}:{path}`, `metadata: { repo, path, commit_sha }`.
- Incremental upsert: compute `content_hash` per chunk; for each `(source, external_id, chunk_index)` query existing hash and skip the embed call when unchanged. Delete stale chunks (chunk_index >= newCount).
- Add a tiny per-source summary in the response (`{ ok, perSource: { docs: { upserted, skipped, deleted }, code: {...}, ... } }`).
- Keep the function admin-gated (current `platform_admins` check stays).

### 5. Expose new sources to the Copilot

- In `copilot-chat/index.ts`, widen the `searchKnowledge` `source` enum to include `"docs"` and `"code"`. Update the tool description so the model knows it can scope a search ("use `code` for repo/sample questions, `docs` for product documentation").
- Update `SYSTEM_PROMPT` with one line: "For SDK/API/usage questions, prefer `searchKnowledge` with `source: 'docs'` or `'code'` and cite the linked URL."
- Result snippets stay capped at 700 chars; for `code` docs include the file path in the title so citations read e.g. `[elsa/src/.../README.md](https://github.com/...)`.

### 6. Scheduling

- Enable `pg_cron` + `pg_net` if not already on.
- Insert a cron job that POSTs to `/functions/v1/copilot-ingest` nightly (03:00 UTC) using the **service-role key** in the `Authorization` header — Copilot ingest currently requires an authenticated platform admin, so add a side-door: accept service-role JWT as a valid caller (verify by decoding the role claim) **only** for the cron path. Cleaner alternative we'll use instead: add an internal shared-secret header (`x-cron-secret`) checked against `Deno.env.get("COPILOT_INGEST_CRON_SECRET")`. New secret added via the secrets tool.
- The SQL is inserted (not migrated) so it stays out of the public migration history per project rules.

### 7. Admin UI

- In `src/pages/dashboard/admin/AdminOverview.tsx` (or a new `AdminCopilot.tsx` panel), add a "Knowledge base" card with:
  - Per-source row (page, faq, db, catalog, docs, code): last ingested at, document count, "Re-ingest" button.
  - Each button calls `supabase.functions.invoke('copilot-ingest', { body: { sources: ['docs'] } })` and toasts the summary.
- Counts come from a small RPC `copilot_documents_summary()` returning `(source, doc_count, last_updated_at)`.

### 8. Cost / safety guardrails

- Firecrawl `map` then `scrape` is bounded: default cap 200 URLs/run, only re-embed changed chunks → typical nightly run embeds a handful of items.
- GitHub fetch uses the recursive tree once per repo per run; raw file fetch only for changed files (compare commit SHA).
- Reuse the existing `embedTexts` batching (32 per call).
- Anonymous Copilot rate limits already in place from the previous round — no change.

## Technical details

### File-level summary
- **migration** — new SQL adding columns, relaxing check constraint, new unique index, summary RPC.
- **new** `supabase/functions/_shared/chunk.ts`
- **new** `supabase/functions/_shared/hash.ts`
- **new** `supabase/functions/_shared/firecrawl.ts`
- **new** `supabase/functions/_shared/github-md.ts`
- **edit** `supabase/functions/copilot-ingest/index.ts` — selective sources, docs + code builders, incremental upsert, cron secret check.
- **edit** `supabase/functions/copilot-chat/index.ts` — broaden `searchKnowledge` source enum + prompt nudge.
- **edit** `src/pages/dashboard/admin/...` — knowledge-base admin panel (or extend `AdminOverview`).
- **insert SQL** (not migration) — `pg_cron` job calling `copilot-ingest` nightly with `x-cron-secret`.
- **secret** `COPILOT_INGEST_CRON_SECRET` — added via the secrets tool.

### What you'll be asked for
1. To connect the **Firecrawl** connector (one click in the picker).
2. To approve the database migration.
3. To approve the `COPILOT_INGEST_CRON_SECRET` secret.

After that I implement everything end-to-end, deploy the edge functions, and run one manual ingest of `docs` + `code` so the Copilot has data immediately.
