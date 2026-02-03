
# Responsive Hero Screenshot Plan

## Overview
Display different screenshot versions based on screen size:
- **Mobile**: Focused workflow canvas screenshot (easier to read on small screens)
- **Desktop**: Full detailed screenshot (shows more context on larger screens)

---

## Implementation Approach

### 1. Add Second Screenshot Asset

Copy the focused screenshot to the assets folder:
- Source: `user-uploads://elsa-screenshot-2-3.png`
- Destination: `src/assets/elsa-studio-designer-mobile.png`

Keep the existing detailed version as-is:
- `src/assets/elsa-studio-designer.png` (desktop version)

---

### 2. Update HeroScreenshot Component

Modify `src/components/home/HeroScreenshot.tsx` to render both images with responsive visibility:

```text
Structure:
┌─────────────────────────────────────────────────┐
│ Glass frame container                           │
│ ┌─────────────────────────────────────────────┐ │
│ │ Mobile image (hidden on md+)                │ │
│ │ Desktop image (hidden below md)             │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

Using Tailwind responsive classes:
- `block md:hidden` - Show only on mobile
- `hidden md:block` - Show only on desktop (md breakpoint = 768px)

---

### 3. Component Code Changes

```tsx
import elsaStudioDesigner from "@/assets/elsa-studio-designer.png";
import elsaStudioDesignerMobile from "@/assets/elsa-studio-designer-mobile.png";

export function HeroScreenshot() {
  return (
    <div className="hero-screenshot-wrapper">
      <div className="screenshot-frame hero-screenshot-frame rounded-xl p-1.5 md:p-2">
        {/* Mobile: focused screenshot */}
        <img
          src={elsaStudioDesignerMobile}
          alt="Elsa Studio workflow designer"
          className="block md:hidden w-full h-auto rounded-lg"
          loading="eager"
        />
        {/* Desktop: detailed screenshot */}
        <img
          src={elsaStudioDesigner}
          alt="Elsa Studio visual workflow designer"
          className="hidden md:block w-full h-auto rounded-lg"
          loading="eager"
        />
      </div>
    </div>
  );
}
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/assets/elsa-studio-designer-mobile.png` | Create | Focused mobile screenshot |
| `src/components/home/HeroScreenshot.tsx` | Update | Add responsive image switching |

---

## Expected Result

- On screens below 768px (mobile/tablet): Shows the focused workflow canvas screenshot that's easier to read
- On screens 768px and above (desktop): Shows the full detailed screenshot with sidebar and more context
- Smooth transition handled by CSS visibility classes
- Both images preloaded with `loading="eager"` for instant display
