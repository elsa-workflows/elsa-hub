## Prerender blog posts at build time

Generate one real `text/html` file per blog post during `vite build` so Medium's importer (and crawlers, Open Graph scrapers, etc.) can read the actual content from `https://www.elsa-workflows.io/blog/<slug>` — no Supabase function involved.

### How it works

1. **New script `scripts/prerender-blog.ts`** runs as a `postbuild` hook (after `vite build` writes `dist/index.html`):
   - Fetch `https://elsa-workflows.github.io/elsa-blog/index.json` → list of posts.
   - For each post, fetch `posts/<slug>.json`.
   - Read the freshly-built `dist/index.html` as the SPA shell template.
   - Inject into a copy of that shell:
     - Real `<title>`, `<meta name="description">`
     - `<link rel="canonical" href="https://www.elsa-workflows.io/blog/<slug>">`
     - Full Open Graph + Twitter card tags (title, description, image, type=article, published_time, author, tags)
     - JSON-LD `BlogPosting` schema
     - The post body as a hidden but crawlable `<div id="prerendered-blog-content">` containing `<article>` with `<h1>`, byline, featured image, description and `post.html`
   - Write to `dist/blog/<slug>/index.html`.
2. **Static hosting serves the per-post file** at `/blog/<slug>` before the SPA fallback. Browsers still hydrate the React app on top — the prerendered `<div>` is removed by `BlogPost.tsx` after mount so users see no double-render.
3. **Sitemap update**: `scripts/generate-sitemap.ts` also fetches the blog index and adds one `<url>` entry per post (`/blog/<slug>` with `lastmod` = `updatedAt || publishedAt`).
4. **`BlogPost.tsx` cleanup**: a small `useEffect` removes `#prerendered-blog-content` on mount so the React-rendered version takes over cleanly. No visible flash because the SPA's own loading state covers it within one paint.

### Medium import

Paste `https://www.elsa-workflows.io/blog/<slug>` directly into Medium's "Import a story". Medium fetches the URL, sees real `text/html` with the article body and canonical link, and imports cleanly. No Supabase function, no sandbox CSP, no dropdown shenanigans.

### Cleanup

- The `blog-export` edge function and the `ShareExportMenu` admin dropdown stay in place for `?format=md` / `?format=json` (markdown download is still useful for copy-paste). I'll add a tooltip note on the "Medium import URL" item explaining the production URL is the recommended route now, and re-point the "Copy Medium import URL" action to `https://www.elsa-workflows.io/blog/<slug>`.

### Files

- **New**: `scripts/prerender-blog.ts`
- **Edited**: `package.json` (add `"postbuild": "tsx scripts/prerender-blog.ts"`), `scripts/generate-sitemap.ts` (append blog entries), `src/pages/BlogPost.tsx` (strip prerendered block on mount), `src/components/blog/ShareExportMenu.tsx` (point Medium URL to canonical site URL).

### Out of scope

- No changes to the upstream blog repo.
- No SSR runtime — purely build-time generation against the GitHub-hosted JSON.
- No removal of the `blog-export` function (kept for MD/JSON export).

### Caveats

- A new post published on GitHub Pages won't appear at `/blog/<slug>` with prerendered HTML until the next deploy of this site. The SPA route still renders it client-side meanwhile (just without Medium-friendly HTML). Acceptable since deploys are frequent.
- If the upstream index fetch fails during build, the script logs a warning and continues — the build won't break.
