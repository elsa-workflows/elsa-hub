

# Hero Screenshot Component Plan

## Overview
Add a visually striking hero screenshot of Elsa Studio's visual designer below the CTA buttons in the hero section. The screenshot will be wrapped in a glass-effect frame with a subtle perspective tilt to create depth and integrate with the space-themed dark mode design.

---

## 1. Asset Setup

Copy the uploaded screenshot to the project:
- Source: `user-uploads://elsa-screenshot-2.png`
- Destination: `src/assets/elsa-studio-designer.png`

This follows the project's pattern of using `src/assets` for React component imports.

---

## 2. Visual Design

### Glass Frame Container
- Semi-transparent background with backdrop blur (matching `.glass-card` styling)
- Subtle border with primary color glow in dark mode
- Rounded corners (`rounded-xl`)
- Shadow for depth

### Perspective Tilt
- Apply subtle 3D perspective transform
- Tilt slightly toward the viewer (rotateX ~2-3deg)
- Add hover interaction that slightly reduces tilt for engagement

### Glow Effect (Dark Mode Only)
- Soft primary-colored glow around the frame
- Enhanced on hover

### Responsive Behavior
- Full width on mobile (with reduced perspective)
- Constrained max-width on larger screens
- Fade-in animation on load

---

## 3. Component Structure

Create a reusable `HeroScreenshot` component in `src/components/home/` for potential future expansion (e.g., adding multiple screenshots later).

### File: `src/components/home/HeroScreenshot.tsx`

```text
Structure:
┌─────────────────────────────────────────────────┐
│ Outer container (perspective origin)            │
│ ┌─────────────────────────────────────────────┐ │
│ │ Glass frame with glow                       │ │
│ │ ┌─────────────────────────────────────────┐ │ │
│ │ │ Screenshot image                        │ │ │
│ │ │                                         │ │ │
│ │ └─────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## 4. CSS Additions

Add new utility classes to `src/index.css`:

```css
/* Hero screenshot glass frame */
.screenshot-frame {
  background: hsl(var(--card) / 0.8);
  border: 1px solid hsl(var(--border));
  box-shadow: var(--shadow-xl);
}

.dark .screenshot-frame {
  background: hsl(240 10% 8% / 0.6);
  backdrop-filter: blur(16px);
  border-color: hsl(var(--primary) / 0.3);
  box-shadow: 
    0 25px 50px -12px hsl(0 0% 0% / 0.5),
    0 0 40px hsl(340 90% 70% / 0.15);
}

.dark .screenshot-frame:hover {
  border-color: hsl(var(--primary) / 0.5);
  box-shadow: 
    0 25px 50px -12px hsl(0 0% 0% / 0.6),
    0 0 60px hsl(340 90% 70% / 0.2);
}
```

---

## 5. Integration into Home Page

### Update: `src/pages/Home.tsx`

Add the screenshot component after the CTA buttons in the hero section:

```tsx
{/* CTAs */}
<div className="flex ...">
  {/* existing buttons */}
</div>

{/* Hero Screenshot - NEW */}
<div className="mt-16 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
  <HeroScreenshot />
</div>
```

---

## 6. Technical Implementation Details

### Perspective Transform CSS
```css
/* Applied via Tailwind classes + custom styles */
.hero-screenshot-wrapper {
  perspective: 1000px;
}

.hero-screenshot-frame {
  transform: rotateX(2deg) rotateY(-1deg);
  transition: transform 0.4s ease-out;
}

.hero-screenshot-frame:hover {
  transform: rotateX(0deg) rotateY(0deg);
}
```

### Mobile Responsiveness
- On mobile (< md): Reduce or remove perspective tilt for usability
- Ensure the image scales proportionally

---

## 7. File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/assets/elsa-studio-designer.png` | Create (copy) | Screenshot asset |
| `src/components/home/HeroScreenshot.tsx` | Create | Screenshot component with glass frame |
| `src/components/home/index.ts` | Create | Barrel export |
| `src/pages/Home.tsx` | Update | Import and add HeroScreenshot below CTAs |
| `src/index.css` | Update | Add screenshot frame utility classes |

---

## 8. Expected Result

The home page hero section will now showcase a large, tilted screenshot of Elsa Studio's visual designer:
- Floating above the background with a subtle 3D effect
- Glass-effect frame that glows in dark mode
- Smooth hover interaction that levels the perspective
- Responsive sizing for all screen sizes
- Animated entrance that follows the CTA buttons

