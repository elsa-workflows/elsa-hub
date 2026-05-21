## Dark mode refresh — deeper, warmer, more substantial

The current dark palette is a cool near-black (`240 6% 7%`) with a hot pink primary on top. That combination reads as "space/neon" — thin surfaces floating on a void. To get a strong, deep, robust feel, shift the foundation from cool void to a warm anthracite base with clearly layered surfaces, a slightly more grounded accent, and weightier borders/shadows.

### Direction

Think: matte graphite, brushed steel, oxblood accent. Less "midnight nebula", more "leather-bound notebook on a slate desk". Surfaces step up clearly so cards feel like physical objects, not glowing panels.

### Token changes (`src/index.css`, `.dark` block only)

Foundation — warm anthracite instead of cool black, with visible elevation steps:

```text
--background        240 6%  7%  →  30 6%  9%      (warm charcoal, not void)
--surface-subtle    240 6%  5%  →  30 6%  6%      (recessed wells)
--card              240 6%  9%  →  30 5% 12%      (clearly raised)
--surface-elevated  240 6% 10%  →  30 5% 14%
--popover           240 6% 11%  →  30 5% 15%
--secondary/muted/accent  240 5% 14%  →  30 5% 17%
--border / --input  240 5% 16%  →  30 5% 22%      (heavier, more present hairlines)
```

Foreground softened off pure white so it sits on the surface instead of buzzing:

```text
--foreground        0 0% 96%  →  30 10% 92%
--muted-foreground  240 4% 64%  →  30 6% 62%
```

Accent — pull magenta slightly toward rose/oxblood so it reads confident rather than neon, while keeping the brand recognizable:

```text
--primary  340 90% 68%  →  340 72% 58%
--ring     340 90% 68%  →  340 72% 58%
```

Shadows — currently tuned for light mode (black on white). In dark mode, swap to deeper, longer shadows so elevation actually reads, plus a subtle top inner-highlight on cards for the "robust object" feel. Add inside the `.dark` block:

```text
--shadow-sm:  0 1px 2px 0 hsl(0 0% 0% / 0.5)
--shadow-md:  0 6px 16px -6px hsl(0 0% 0% / 0.55)
--shadow-lg:  0 16px 40px -16px hsl(0 0% 0% / 0.6)
--shadow-xl:  0 28px 64px -24px hsl(0 0% 0% / 0.65)
```

Sidebar tokens follow the same shifts (background → `30 6% 8%`, border → `30 5% 22%`, primary → new accent).

Chart-1 follows the new primary hue.

### Optional polish (small, additive)

- Add a barely-visible 1px top inner highlight on `.glass-card` / cards in dark mode: `box-shadow: inset 0 1px 0 hsl(0 0% 100% / 0.04);` — gives surfaces a tactile "machined edge".
- Body text in dark mode: nudge letter-spacing on body to `0.005em` for a touch more weight at small sizes.

### What's not changing

- Light mode tokens, typography, radii, layout, components, and the magenta-as-sole-accent rule all stay.
- No reintroduction of space background, gradients, or glassmorphism.

### Files touched

- `src/index.css` — only the `.dark { … }` block and one optional `.glass-card` dark rule.

After applying, I'll spot-check the homepage, dashboard, and a card-heavy page in dark mode to confirm contrast and the elevation hierarchy reads correctly.