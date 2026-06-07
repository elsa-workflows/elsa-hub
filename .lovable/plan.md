## Goal
Add a Blog tile to the "Join the Ecosystem" card grid on the homepage, linking to the internal `/blog` route.

## Changes

### 1. `src/pages/Home.tsx`

**a) Import `Newspaper` icon** from `lucide-react` alongside existing imports.

**b) Add a Blog entry to `ecosystemLinks`**:
```ts
{
  icon: Newspaper,
  title: "Blog",
  description: "Read the latest news, guides, and updates",
  to: "/blog"
}
```

**c) Update rendering logic** in the ecosystem grid to support both internal (`to`) and external (`href`) links:
- If `to` exists, render a React Router `<Link to={...}>`
- If `href` exists, render an `<a href={...} target="_blank" rel="noopener noreferrer">`
- Keep the same card styling, hover effects, and external-link icon behavior (show `ExternalLink` only on external links)

**d) Adjust grid columns** from `lg:grid-cols-4` to `lg:grid-cols-4` (already 4 columns, but now there are 4 items — still works) or `lg:grid-cols-2` / adjust as needed. With 4 items, `lg:grid-cols-4` remains appropriate.