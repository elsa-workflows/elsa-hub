

# Cosmic Events Variation System

## Vision
Transform the space background from a single supernova effect into a rich collection of awe-inspiring cosmic phenomena. Each event will be rare and visually distinct, creating moments of wonder when they appear.

## Cosmic Events to Add

### 1. Supernova Variations (Enhance Existing)
- **Classic Supernova** (current): White core with rose glow
- **Blue Giant Collapse**: Brilliant blue-white core fading to deep blue
- **Red Hypergiant**: Warm amber/orange explosion with red outer glow
- **Neutron Star Birth**: Intense cyan pulse with rippling rings

### 2. Pulsar Beam
A rotating beam of light that sweeps across the screen like a cosmic lighthouse.
- Thin, intense beam rotating 360°
- Brief visibility window (beam "sweeps" past viewer)
- Blue-white coloring with subtle glow
- Duration: ~4-5 seconds

### 3. Nebula Flash
A distant nebula region briefly illuminates, as if a star within it flared.
- Soft, diffuse glow that brightens and fades
- Larger area effect (500-800px)
- Purple/magenta tones matching the existing nebulae
- Duration: ~6-8 seconds (slow fade in/out)

### 4. Gravitational Lensing Ripple
A subtle distortion wave that ripples outward, simulating light bending around a massive object.
- Concentric rings that expand and fade
- Very subtle visual distortion effect
- Duration: ~4 seconds

### 5. Binary Star Flare
Two close points of light that briefly brighten together.
- Two small bright points near each other
- Synchronized pulse effect
- White/gold coloring
- Duration: ~2-3 seconds

---

## Implementation Architecture

### Rename & Refactor
Rename `Supernova.tsx` → `CosmicEvents.tsx` to reflect its expanded role.

### Event Type System
```typescript
type CosmicEventType = 
  | 'supernova-classic'
  | 'supernova-blue'
  | 'supernova-red'
  | 'supernova-neutron'
  | 'pulsar'
  | 'nebula-flash'
  | 'binary-flare';
```

### Weighted Random Selection
Different events have different rarity:
- Classic Supernova: 25%
- Blue Giant: 15%
- Red Hypergiant: 15%
- Neutron Star: 10%
- Pulsar: 15%
- Nebula Flash: 12%
- Binary Flare: 8%

### Event-Specific Rendering
Each event type has its own visual component with unique:
- Color gradients
- Size parameters
- Animation keyframes
- Duration

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/space/Supernova.tsx` | Rename to `CosmicEvents.tsx`, add event types and weighted selection |
| `src/components/space/SpaceBackground.tsx` | Update import to use new component name |
| `src/components/space/index.ts` | Update export if it exists |
| `src/index.css` | Add new keyframe animations for pulsar rotation, nebula-flash, binary-pulse |

---

## New CSS Animations

```css
/* Pulsar beam rotation */
@keyframes pulsar-sweep {
  0% { transform: translate(-50%, -50%) rotate(0deg); opacity: 0; }
  10% { opacity: 0.8; }
  90% { opacity: 0.8; }
  100% { transform: translate(-50%, -50%) rotate(360deg); opacity: 0; }
}

/* Nebula flash - soft glow */
@keyframes nebula-flash {
  0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
  40%, 60% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
}

/* Binary star synchronized pulse */
@keyframes binary-pulse {
  0%, 100% { opacity: 0; transform: scale(0.5); }
  30%, 70% { opacity: 1; transform: scale(1); }
}

/* Neutron star with ripple rings */
@keyframes neutron-ripple {
  0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
  20% { opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
}
```

---

## Visual Design Details

### Supernova Color Palettes
| Variant | Core | Mid-glow | Outer |
|---------|------|----------|-------|
| Classic | White | Rose (340°) | Pink/transparent |
| Blue Giant | White | Cyan (195°) | Deep blue |
| Red Hypergiant | Yellow | Orange (30°) | Deep red |
| Neutron Star | White | Cyan (180°) | Teal ripples |

### Pulsar Design
- Central bright point (4-6px)
- Long thin beam (2px height, 300px+ length)
- Beam fades toward the ends
- Full 360° rotation over 4-5 seconds

### Nebula Flash
- Very large, diffuse circle (600-800px)
- Soft edges (heavy blur)
- Colors sampled from existing nebula palette
- Slow breathing animation

---

## Technical Notes

- All events respect `prefers-reduced-motion`
- Events are cleaned up after their animation completes
- Visibility API pauses spawning when tab is hidden
- Each event has appropriate z-index layering
- Performance-conscious: only 1-2 events active at a time maximum

