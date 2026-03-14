

## Fix: Growth Pack Card Bottom Misalignment

### Problem
The "Popular" Growth Pack card uses `md:-translate-y-2` to visually elevate it, but this causes its bottom edge to sit higher than the other cards, creating a visible misalignment at the bottom of the row. The CSS `translate` only moves the card visually without affecting the grid layout, so the other cards don't adjust.

### Solution
Add `items-end` to the grid container so all cards align at their bottom edges. This way, the Growth Pack still "pops up" visually but its bottom edge stays aligned with the other cards.

### File Change
**`src/pages/enterprise/providers/ValenceWorks.tsx`** (line 343)

Change:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
```
To:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
```

This single class addition ensures all four cards share a common bottom edge while the Growth Pack still extends upward with its `-translate-y-2` and "Popular" badge.

