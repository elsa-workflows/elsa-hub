## Blog tag filtering

Add a tag-based filter to `/blog` driven by a URL query param so tags are linkable, shareable, and back-button friendly. No new route — `/blog?tag=dotnet` filters the existing list.

### Behavior

- Each tag chip (on the blog index cards and on the post detail page) becomes a link to `/blog?tag={tag}`.
- On `/blog`, if `?tag=` is present, only posts containing that tag are shown.
- A filter bar above the grid shows:
  - Active filter pill: "Filtered by: `{tag}` ✕" — the ✕ clears back to `/blog`.
  - A horizontally-scrollable list of all tags found across posts, with counts, each linking to `/blog?tag={tag}`. The active tag is visually highlighted.
- Empty state when no posts match: "No posts tagged `{tag}`" with a link back to all posts.
- Header h1/description stay the same; SEO title/description gain " — tagged {tag}" when filtered, and the canonical URL stays `/blog` (filter is a view, not a separate indexable page; we also add `<meta name="robots" content="noindex">` when a tag filter is active to avoid duplicate content).

### Files to touch

- `src/pages/Blog.tsx` — read `tag` from `useSearchParams`, compute the tag list + counts from `posts`, render the filter bar, filter the grid, and wrap card tag badges in `Link`s (stop event propagation so they don't trigger the card link).
- `src/pages/BlogPost.tsx` — wrap the tag badges in the post header in `Link`s to `/blog?tag={tag}`.

### Out of scope

- Multi-tag (AND/OR) filtering, category filter, search box, or a dedicated `/blog/tags/{tag}` route. Single-tag query param keeps it simple and easily extended later.
