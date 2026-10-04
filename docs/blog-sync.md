# Blog prerender sync

## Why it exists

`scripts/prerender-blog.ts` runs after the production build (postbuild). It fetches `https://elsa-workflows.github.io/elsa-blog/index.json` and writes `dist/blog/<slug>.html` for each post. The sitemap step also reads that index and adds `/blog/<slug>` entries.

Lovable rebuilds this site only when a new commit lands on elsa-hub. A post that merges on elsa-blog does not trigger a rebuild here. Until something lands on elsa-hub `main` and the site is published, the new slug has no prerendered `.html` file and no sitemap entry.

## When to bump

After an elsa-blog post merges and the GitHub Pages deploy for elsa-blog is green.

## What to change

Open a small PR that updates `blog-sync.json` at the repo root (not under `public/`, so it is not served):

- `latestSlug`: the post slug
- `blogCommit`: the full SHA of elsa-blog `main`
- `syncedAt`: the date of this bump (`YYYY-MM-DD`)

The build does not read this file. The commit itself is what triggers the rebuild.

## After the bump PR merges

1. Publish the site in Lovable.
2. Check that `https://www.elsaworkflows.io/blog/<slug>.html` returns 200 and includes `data-prerendered`.
3. Check that `https://www.elsaworkflows.io/sitemap.xml` lists `/blog/<slug>`.
