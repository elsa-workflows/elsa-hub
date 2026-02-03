
# Wider Hero Screenshot Plan

## Overview
Restore the original detailed screenshot and make it display wider by breaking out of the narrow hero text container. This will give the screenshot more visual impact while keeping the text content centered and readable.

---

## Changes Required

### 1. Restore Original Screenshot

Replace the current asset with the first uploaded version:
- Source: `user-uploads://elsa-screenshot-2.png` (original with full detail)
- Destination: `src/assets/elsa-studio-designer.png`

---

### 2. Restructure Home Page Hero Section

The current screenshot is constrained by `max-w-3xl` (768px). We'll move it outside that container so it can utilize the full `max-w-1100px` defined in the CSS.

**Current structure:**
```text
<section>
  <div className="container">
    <div className="max-w-3xl mx-auto">  <-- Limits width to 768px
      [Hero text content]
      [Screenshot]  <-- Constrained!
    </div>
  </div>
</section>
```

**New structure:**
```text
<section>
  <div className="container">
    <div className="max-w-3xl mx-auto">
      [Hero text content]
    </div>
    [Screenshot]  <-- Now free to use full 1100px width
  </div>
</section>
```

---

### 3. CSS Adjustment (Optional)

The `.hero-screenshot-wrapper` already has `max-width: 1100px` and `margin: 0 auto`. This should work as-is, but we can increase it further if desired:

| Width | Effect |
|-------|--------|
| 1100px | Current - balanced width |
| 1200px | Slightly wider |
| 1400px | Near full-width on most screens |

I'll keep it at 1100px initially - we can adjust after seeing the result.

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/assets/elsa-studio-designer.png` | Replace | Restore original detailed screenshot |
| `src/pages/Home.tsx` | Update | Move screenshot outside the `max-w-3xl` container |

---

## Expected Result

The hero section will display:
- Text content (badge, headline, description, benefits, CTAs) centered in a readable 768px column
- Screenshot displayed wider at 1100px, creating a visually impactful showcase that better displays the detailed workflow designer UI
