## Build: Blog export endpoint + admin Share dropdown

### 1. Edge function `supabase/functions/blog-export/index.ts` (public, no JWT)

Route: `GET /functions/v1/blog-export/<slug>?format=html|md|json` (default `html`).

- Fetches `https://elsa-workflows.github.io/elsa-blog/posts/<slug>.json`.
- Renders:
  - **html** — full `<!doctype html>` with `<title>`, description, `<link rel="canonical">` back to `https://www.elsaworkflows.io/blog/<slug>`, OG/article meta, and an `<article>` containing title, byline, featured image, description, then `post.html`. This is the URL to paste into Medium's importer.
  - **md** — Markdown via `turndown` (esm.sh) with YAML frontmatter (title, description, date, authors, category, tags, canonical) + featured image + body.
  - **json** — passthrough of upstream JSON for debugging.
- Headers: `Cache-Control: public, max-age=300, s-maxage=300`, `Link: <canonical>; rel="canonical"`, CORS.
- 404 if upstream 404, 502 on other upstream failures.
- Register in `supabase/config.toml` with `verify_jwt = false`.

### 2. `src/components/blog/ShareExportMenu.tsx`

Outline button "Share / Export" using `DropdownMenu` with three sections:
- **Medium import** — "Copy Medium import URL" (the `?format=html` URL) and "Open Medium importer" (→ `https://medium.com/p/import`).
- **View as** — HTML / Markdown / JSON links (new tab).
- **Copy URL** — copy HTML / MD / JSON URLs.

Uses sonner `toast` for copy feedback. URL built from the hardcoded Supabase URL already in `client.ts`.

### 3. Wire into `src/pages/BlogPost.tsx`

- Import `useIsAdmin` and `ShareExportMenu`.
- In the article header row (next to the date/category metadata, right-aligned on md+), render `{isAdmin && <ShareExportMenu slug={post.slug} />}`. Admin-only, no UI for everyone else.

### Out of scope

No changes to the upstream blog repo, no SSR of the SPA, no new auth.

### Verification

After deploy, hit `…/functions/v1/blog-export/console-log-streaming?format=html` with curl and confirm 200 + canonical `Link` header, then paste the same URL into Medium's importer.
