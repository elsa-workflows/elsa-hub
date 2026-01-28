
# Fix "Most Popular" Badge Layering Issue

## Problem

The "Most Popular" badge on the Expert Services page appears to have the card border showing through it. This happens because:

1. The badge is positioned with `absolute -top-3` which places it overlapping the card's top border
2. The default badge variant uses `bg-primary/20` - a semi-transparent background (20% opacity)
3. Even though `z-10` puts the badge above the border in stacking order, the transparent background allows the border to show through visually

## Solution

Override the badge background with an opaque color so the card border is completely hidden behind it.

## Implementation

### File: `src/pages/enterprise/ExpertServices.tsx`

Update the Badge className to include an opaque background color instead of relying on the default translucent variant:

**Current code (line 286):**
```tsx
<Badge className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
```

**Updated code:**
```tsx
<Badge className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-primary text-primary-foreground">
```

This adds:
- `bg-primary` - solid primary color background (opaque)
- `text-primary-foreground` - ensures text remains readable

## Why This Works

The original badge uses `bg-primary/20` which is 20% opacity. By explicitly setting `bg-primary` (100% opacity), the badge background completely covers the card border beneath it, eliminating the visual layering issue.

## Summary

| File | Change |
|------|--------|
| `src/pages/enterprise/ExpertServices.tsx` | Add opaque background classes to the "Most Popular" Badge |
