

## Update "Enterprise" References to "Elsa+"

This plan consolidates remaining "Enterprise" terminology to "Elsa+" across the codebase, aligning with the unified brand established in the navigation.

---

### Changes Overview

| File | Current Text | Updated Text |
|------|-------------|--------------|
| `src/pages/Home.tsx` | "Enterprise Solutions" button | "Explore Elsa+" |
| `src/components/layout/Footer.tsx` | "Enterprise" link | "Elsa+" |
| `src/pages/Resources.tsx` | "Need Enterprise Support?" heading & button | "Need Professional Support?" + "Explore Elsa+" |

---

### 1. Homepage CTA Button
**File:** `src/pages/Home.tsx` (lines 191-195)

Update the bottom CTA button:
- Change link from `/enterprise` → `/elsa-plus`
- Change text from "Enterprise Solutions" → "Explore Elsa+"

---

### 2. Footer Navigation
**File:** `src/components/layout/Footer.tsx` (lines 13-15)

Update the footer link in the "Product" section:
- Change label from "Enterprise" → "Elsa+"
- Change path from `/enterprise` → `/elsa-plus`

---

### 3. Resources Page CTA Section
**File:** `src/pages/Resources.tsx` (lines 232-241)

Update the call-to-action section at the bottom:
- Change heading from "Need Enterprise Support?" → "Need Professional Support?"
- Change link from `/enterprise` → `/elsa-plus`
- Change button text from "Learn About Enterprise" → "Explore Elsa+"

---

### Technical Details

The `/enterprise` route is already configured to redirect to `/elsa-plus`, so existing bookmarks will continue to work. However, updating these references ensures a consistent user experience and avoids unnecessary redirects.

