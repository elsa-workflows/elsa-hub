

## Immersive Space Background for Dark Mode

### Overview
Create a captivating space experience that activates only in dark mode, featuring:
- Subtle, slowly drifting nebulae with soft color gradients
- Twinkling stars that drift very slowly (simulating travel through space)
- Two types of shooting stars with randomized timing
- Rare supernova bursts that delight visitors

---

### Architecture

Create a new `SpaceBackground` component that renders a fixed, full-screen canvas behind all content. It will:
1. Detect dark mode using `next-themes`
2. Render nothing in light mode (zero performance impact)
3. Use CSS animations for nebulae and simple stars
4. Use a canvas or pure CSS for shooting stars and supernovas

---

### Visual Elements

#### 1. Nebulae (CSS-based)
- 2-3 large, soft gradient blobs positioned across the viewport
- Very slow drift animation (60-120 second cycles)
- Subtle opacity (0.05-0.15) to not distract from content
- Colors: deep purples, magentas, and hints of the brand rose color

#### 2. Star Field (CSS-based)
- Multiple layers of stars at different sizes
- Very slow parallax drift (simulating travel through space)
- Subtle twinkling via opacity animation with staggered delays
- ~100-150 stars distributed across the viewport

#### 3. Shooting Stars (2 Variants)

| Variant | Speed | Trail | Frequency | Description |
|---------|-------|-------|-----------|-------------|
| **Distant** | Very slow (3-5s) | Long, fading trail | Every 15-30s | Far away in space, slow and majestic |
| **Closer** | Medium (1-2s) | Shorter trail | Every 30-60s | Nearer, slightly faster |

Randomness within each variant:
- Start position (random edge point)
- Angle (within bounds, typically 30-60 degrees)
- Exact duration (randomized within range)
- Brightness/size variation

#### 4. Supernova (Rare Delight)
- Occurs randomly every 60-180 seconds
- Brief, bright pulse that expands and fades
- Subtle glow in brand colors
- Duration: 2-3 seconds

---

### Technical Implementation

#### Files to Create/Modify

| File | Purpose |
|------|---------|
| `src/components/space/SpaceBackground.tsx` | Main component with all space elements |
| `src/components/space/Nebulae.tsx` | CSS-based nebula clouds |
| `src/components/space/StarField.tsx` | Twinkling star layer |
| `src/components/space/ShootingStars.tsx` | Manages shooting star spawning |
| `src/components/space/Supernova.tsx` | Rare supernova effect |
| `src/components/space/index.ts` | Barrel export |
| `src/index.css` | Add keyframe animations |
| `src/App.tsx` | Mount SpaceBackground at root level |

---

### Component Structure

```text
SpaceBackground (fixed, full-screen, pointer-events-none, z-0)
├── Nebulae
│   ├── Nebula 1 (purple-magenta, slow drift)
│   ├── Nebula 2 (rose-pink, opposite drift)
│   └── Nebula 3 (deep blue-violet, vertical drift)
├── StarField
│   ├── Layer 1: Tiny stars (slow drift, many)
│   ├── Layer 2: Small stars (slower drift, fewer)
│   └── Layer 3: Medium stars (slowest, sparse)
├── ShootingStars
│   ├── Spawns distant meteors (3-5s duration)
│   └── Spawns closer meteors (1-2s duration)
└── Supernova (rare pulse effect)
```

---

### Animation Keyframes (index.css additions)

```css
/* Nebula drift animations */
@keyframes nebula-drift-1 { ... } /* 90s horizontal drift */
@keyframes nebula-drift-2 { ... } /* 120s diagonal drift */

/* Star field parallax */
@keyframes star-drift { ... } /* Very slow movement */

/* Star twinkling */
@keyframes twinkle { ... } /* Opacity pulse */

/* Shooting star animations */
@keyframes meteor-distant { ... } /* 3-5s diagonal traverse */
@keyframes meteor-close { ... } /* 1-2s faster traverse */
@keyframes meteor-trail { ... } /* Trail fade effect */

/* Supernova pulse */
@keyframes supernova-burst { ... } /* Expand and fade */
```

---

### Performance Considerations

1. **Dark mode only**: Component returns `null` in light mode
2. **CSS animations**: GPU-accelerated, no JavaScript animation loops
3. **Minimal DOM**: Stars use pseudo-elements where possible
4. **RequestAnimationFrame**: Only for spawning new shooting stars
5. **Visibility API**: Pause animations when tab is hidden
6. **Reduced motion**: Respect `prefers-reduced-motion` media query

---

### Integration

The `SpaceBackground` component will be mounted at the App root level, positioned as a fixed background layer with `z-index: 0` and `pointer-events: none`. All existing content will layer above it naturally.

```tsx
// App.tsx
<ThemeProvider ...>
  <SpaceBackground /> {/* Fixed behind everything */}
  <TooltipProvider>
    ...
  </TooltipProvider>
</ThemeProvider>
```

---

### Randomization Details

Shooting stars will use a spawner pattern:

```text
Distant Meteors:
- Spawn interval: random 15-30 seconds
- Duration: random 3-5 seconds  
- Start: random point along top/right edge
- Angle: 30-50 degrees (slight variation)
- Trail length: 150-250px
- Opacity: 0.4-0.6

Closer Meteors:
- Spawn interval: random 30-60 seconds
- Duration: random 1-2 seconds
- Start: random point along top/right edge
- Angle: 40-60 degrees
- Trail length: 80-150px
- Opacity: 0.6-0.9 (brighter = closer)
```

Supernova:
- Spawn interval: random 60-180 seconds
- Position: random point on screen
- Color: brand rose with white core
- Max size: 150-300px radius

