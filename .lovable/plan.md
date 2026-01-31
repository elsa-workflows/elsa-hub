

## Juicier Primary Pink for Dark Mode

A simple but impactful change: boost the primary color in dark mode to be more vivid and "forbidden" while keeping the light mode's professional pink untouched.

---

### Current vs Proposed

| Token | Current (Dark) | Proposed (Dark) | Light (unchanged) |
|-------|----------------|-----------------|-------------------|
| `--primary` | `335 85% 65%` | `340 90% 70%` | `333 71% 50%` |
| `--ring` | `335 85% 65%` | `340 90% 70%` | `333 71% 50%` |
| `--sidebar-primary` | `335 85% 65%` | `340 90% 70%` | `333 71% 50%` |
| `--sidebar-ring` | `335 85% 65%` | `340 90% 70%` | `333 71% 50%` |

### What Changes

The new `340 90% 70%` gives you:
- **Higher saturation** (90% vs 85%) - more vivid, less washed out
- **Higher lightness** (70% vs 65%) - matches the "juicy" accent colors
- **Slightly warmer hue** (340 vs 335) - pushes it toward a more passionate rose-magenta

This creates a more dramatic contrast against the near-black background and matches the intensity of the accent colors already in use.

---

### File to Modify

| File | Changes |
|------|---------|
| `src/index.css` | Update 4 dark mode variables: `--primary`, `--ring`, `--sidebar-primary`, `--sidebar-ring` |

---

### Result

Buttons, links, and focus rings in dark mode will have that same vivid, passionate pop as the accent colors, while light mode remains clean and professional. The noir aesthetic gets an extra dose of forbidden passion.

