

## Gorgeous Dark Mode with Animated Toggle Switch

This plan adds a polished dark mode experience with a beautiful animated toggle switch that works throughout the entire application.

---

### Current State

The project already has excellent dark mode infrastructure:
- **CSS Variables**: Full light/dark color palettes defined in `src/index.css`
- **Tailwind**: Configured with `darkMode: ["class"]`
- **next-themes**: Already installed (v0.3.0)
- **Sonner**: Already uses `useTheme` and will work automatically

What's missing:
- `ThemeProvider` wrapper around the app
- Toggle switch component in the UI

---

### Implementation Overview

| Component | Description |
|-----------|-------------|
| **ThemeProvider** | Wrap app in `next-themes` provider with system preference detection |
| **ThemeToggle** | Beautiful animated toggle with sun/moon icons and smooth transitions |
| **Navigation** | Add toggle to public site header (desktop + mobile) |
| **DashboardHeader** | Add toggle to dashboard header |
| **CSS Refinements** | Enhance dark mode palette for a more premium feel |

---

### Step 1: Create ThemeToggle Component

**File:** `src/components/ui/theme-toggle.tsx`

A gorgeous animated toggle featuring:
- **Sun/Moon Icons**: Smooth rotation and scale animations on toggle
- **Tooltip**: Shows current mode on hover
- **System Preference Support**: Respects OS preference by default
- **Persistent Storage**: Remembers user preference in localStorage

```text
Design:

  ┌─────────────────────────────────────┐
  │  Light Mode          Dark Mode      │
  │                                     │
  │    ☀️ ─────────────── 🌙            │
  │   (rotate in)      (rotate in)      │
  │                                     │
  │  Smooth 200ms transition with       │
  │  scale + rotation animation         │
  └─────────────────────────────────────┘
```

---

### Step 2: Wrap App in ThemeProvider

**File:** `src/App.tsx`

Add `ThemeProvider` from next-themes with:
- `attribute="class"` - Uses class-based dark mode (matches Tailwind config)
- `defaultTheme="system"` - Respects user's OS preference
- `enableSystem` - Enables system preference detection
- `disableTransitionOnChange` - Optional smooth theme transitions

---

### Step 3: Add Toggle to Navigation

**File:** `src/components/layout/Navigation.tsx`

Add the toggle to:
- Desktop nav (between Docs and GitHub buttons)
- Mobile slide-out menu (near the bottom, before sign in)

---

### Step 4: Add Toggle to Dashboard Header

**File:** `src/components/dashboard/DashboardHeader.tsx`

Add the toggle next to the notification bell, before the user avatar dropdown.

---

### Step 5: Refine Dark Mode Colors (Optional Enhancement)

**File:** `src/index.css`

Fine-tune the dark palette for a more premium, modern feel:

| Token | Current | Proposed Enhancement |
|-------|---------|---------------------|
| `--background` | `240 5% 10%` | `222 47% 11%` (deeper, slightly blue) |
| `--card` | `240 3% 15%` | `222 47% 13%` (consistent with bg) |
| `--popover` | `240 5% 26%` | `222 47% 16%` (elevated feel) |
| `--sidebar-background` | `220 20% 8%` | `222 47% 8%` (unified) |

This creates a cohesive, modern dark UI with subtle blue undertones.

---

### Files to Create/Modify

| Action | File | Description |
|--------|------|-------------|
| Create | `src/components/ui/theme-toggle.tsx` | Animated sun/moon toggle component |
| Modify | `src/App.tsx` | Wrap with ThemeProvider |
| Modify | `src/components/layout/Navigation.tsx` | Add toggle to public header |
| Modify | `src/components/dashboard/DashboardHeader.tsx` | Add toggle to dashboard |
| Modify | `src/index.css` | Refine dark mode colors (optional) |

---

### Technical Details

**ThemeToggle Component:**

```typescript
// Uses next-themes useTheme hook
const { theme, setTheme, resolvedTheme } = useTheme();

// Toggle between light and dark
const toggleTheme = () => {
  setTheme(resolvedTheme === "dark" ? "light" : "dark");
};
```

**Animation approach:**
- Sun icon: rotates 90° and scales down when leaving, scales up when entering
- Moon icon: rotates -90° and scales down when leaving, scales up when entering
- CSS transitions for smooth color changes site-wide

**Accessibility:**
- Keyboard accessible (button element)
- ARIA label describes current state
- Visible focus ring
- Works with screen readers

---

### Result

Users will be able to:
1. Click the toggle in the header to switch between light and dark mode
2. Have their preference remembered across sessions
3. Experience smooth, animated transitions
4. Use their OS preference by default (system theme)

The toggle will appear in both the public navigation and the dashboard header, ensuring a consistent experience throughout the application.

