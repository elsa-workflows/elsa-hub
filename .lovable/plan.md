
# Enterprise Page Redesign: Category Cards

## Overview
Transform the Enterprise page from multiple sections with one card each into a clean, unified grid of category cards. Each category card will navigate to a dedicated detail page listing providers and their offerings.

## Current Issues
- Three separate sections with individual headings create visual imbalance
- Most categories have only one service card, leaving grids mostly empty
- Repetitive layout with alternating backgrounds feels heavy
- Information redundancy between section titles and card titles

## Proposed Design

### Enterprise Page (Main)
A single, clean grid displaying all three service categories:

```text
+------------------------------------------+
|        Professional Services Ecosystem   |
|              (Hero section)              |
+------------------------------------------+
|                                          |
|  +------------+  +------------+  +-----+ |
|  |   Expert   |  |   Docker   |  |Train| |
|  |  Advisory  |  |   Images   |  |ing &| |
|  |     &      |  |            |  |Acad-| |
|  |Engineering |  | Coming Soon|  |emy  | |
|  +------------+  +------------+  +-----+ |
|                                          |
+------------------------------------------+
|         Neutrality Disclaimer            |
+------------------------------------------+
```

### Category Card Component
Create a new `CategoryCard` component with:
- Large icon representing the category
- Category title
- Brief description (1-2 lines)
- Optional "Coming Soon" badge
- Arrow indicator for navigation
- Hover state with subtle elevation/border change

### Category Detail Pages
The existing detail pages already work well:
- `/enterprise/expert-services` - Lists Skywalker Digital's expert services
- `/enterprise/docker-images` - Lists Docker image offerings (coming soon)
- `/enterprise/training` - Lists training providers (coming soon)

These pages are already structured to handle multiple providers in the future.

---

## Technical Implementation

### 1. Create CategoryCard Component
**File:** `src/components/enterprise/CategoryCard.tsx`

A new card component optimized for category navigation:
- Props: `title`, `description`, `icon`, `href`, `comingSoon`
- Large centered icon from lucide-react
- Clean typography with primary title
- Subtle hover animation
- "Coming Soon" badge when applicable

### 2. Update Enterprise Page
**File:** `src/pages/Enterprise.tsx`

- Remove the three separate sections
- Add a single grid section after the hero
- Display three `CategoryCard` components
- Keep the Neutrality Disclaimer at the bottom

Categories to display:
| Category | Icon | Route |
|----------|------|-------|
| Expert Advisory & Engineering | `Users` | `/enterprise/expert-services` |
| Enterprise Docker Images | `Container` | `/enterprise/docker-images` |
| Training & Academy | `GraduationCap` | `/enterprise/training` |

### 3. Export New Component
**File:** `src/components/enterprise/index.ts`

Add `CategoryCard` to the barrel export.

---

## Visual Styling Details

### Category Card Styling
- White background with subtle border
- Rounded corners (rounded-xl)
- Padding: p-8 for comfortable spacing
- Icon: 48x48px in primary color with light background circle
- Title: text-xl font-semibold
- Description: text-muted-foreground, 2 lines max
- Hover: border-primary/50, shadow-lg, slight translateY
- "Coming Soon" cards: reduced opacity, muted colors

### Grid Layout
- Desktop (lg): 3 columns
- Tablet (md): 2 columns (with training card spanning or below)
- Mobile: 1 column, stacked

---

## Benefits of This Approach

1. **Cleaner visual hierarchy** - One clear section instead of three sparse ones
2. **Scannable** - Users can quickly see all service categories
3. **Scalable** - Easy to add new categories as they emerge
4. **Consistent navigation** - Click category, see providers
5. **Future-proof** - Detail pages can list multiple providers per category

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/enterprise/CategoryCard.tsx` | Create new component |
| `src/components/enterprise/index.ts` | Add export |
| `src/pages/Enterprise.tsx` | Simplify to single grid |

