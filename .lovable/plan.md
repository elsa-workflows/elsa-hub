

# Add Black Hole Cosmic Event with Gravitational Lensing

## Overview
Add a new rare black hole cosmic event that creates a dramatic gravitational lensing distortion effect. This will be the rarest and most impactful cosmic event in the system.

## Visual Components

### Black Hole Structure
1. **Dark Core** - A small deep purple/black center that absorbs light
2. **Event Horizon Glow** - Orange/purple edge glow around the core
3. **Accretion Disk** - A spinning ring of heated matter (orange/yellow gradient)
4. **Lensing Rings** - Multiple concentric rings that pulse outward, simulating gravitational light bending

### Animation Phases
```text
┌─────────────────────────────────────────────────────────────────┐
│  Phase 1: Appearance (0-15%)                                    │
│  - Core fades in from transparent                               │
│  - Accretion ring begins spinning                               │
├─────────────────────────────────────────────────────────────────┤
│  Phase 2: Lensing Effect (15-85%)                               │
│  - Multiple rings expand outward with staggered delays          │
│  - Accretion ring continues rotation                            │
│  - Core maintains dark presence                                 │
├─────────────────────────────────────────────────────────────────┤
│  Phase 3: Collapse (85-100%)                                    │
│  - All elements fade out                                        │
│  - Rings dissipate                                              │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Update Type Definition
Add `"black-hole"` to the `CosmicEventType` union.

### 2. Adjust Weight Distribution
Rebalance weights to give black hole ~5% rarity while maintaining existing proportions:

| Event | Current Weight | New Weight |
|-------|---------------|------------|
| supernova-classic | 25 | 23 |
| supernova-blue | 15 | 14 |
| supernova-red | 15 | 14 |
| supernova-neutron | 10 | 10 |
| pulsar | 15 | 14 |
| nebula-flash | 12 | 11 |
| binary-flare | 8 | 8 |
| **black-hole** | - | **6** |

### 3. Event Configuration
- Size: 200-350px (medium-large for visual impact)
- Duration: 5000ms (longer than most events for dramatic effect)

### 4. BlackHoleEvent Component Structure
```text
<Container>
  ├── <DarkCore>           // Deep purple/black radial gradient
  ├── <EventHorizonGlow>   // Orange/purple edge glow (box-shadow)
  ├── <AccretionDisk>      // Spinning ring with animate-black-hole-spin
  └── <LensingRings>       // 4-5 expanding rings with staggered delays
       ├── Ring 0 (delay: 0ms)
       ├── Ring 1 (delay: 300ms)
       ├── Ring 2 (delay: 600ms)
       ├── Ring 3 (delay: 900ms)
       └── Ring 4 (delay: 1200ms)
</Container>
```

### 5. New CSS Animations

**Black Hole Appearance Animation:**
```css
@keyframes black-hole-appear {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.3);
  }
  15% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  85% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.5);
  }
}
```

**Accretion Disk Spin:**
```css
@keyframes black-hole-spin {
  0% {
    transform: rotate(0deg);
    opacity: 0;
  }
  15% {
    opacity: 0.8;
  }
  85% {
    opacity: 0.8;
  }
  100% {
    transform: rotate(180deg);
    opacity: 0;
  }
}
```

**Lensing Ring Expansion:**
```css
@keyframes black-hole-lensing {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  20% {
    opacity: 0.5;
  }
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/space/CosmicEvents.tsx` | Add black-hole type, weight, config, and BlackHoleEvent component |
| `src/index.css` | Add black-hole-appear, black-hole-spin, black-hole-lensing keyframes and utility classes |

## Performance Considerations
- No blur filters used (GPU-friendly)
- Uses box-shadow for glows (hardware accelerated)
- Transform and opacity only for animations (compositor-only properties)
- Limited to 5 lensing rings to prevent DOM overhead

## Technical Details

### BlackHoleEvent Component Implementation
The component will render:
1. A container div positioned at the event coordinates
2. A dark core using radial-gradient from deep purple to transparent
3. An accretion disk as a border-only div with orange gradient, rotated during animation
4. 5 lensing rings using box-shadow rings that scale outward with staggered animation-delay

### Color Palette
- Core: `hsl(280 40% 5%)` (near-black purple)
- Event Horizon: `hsl(30 90% 50%)` (warm orange glow)
- Accretion Disk: Linear gradient from orange to yellow
- Lensing Rings: `hsl(30 70% 50% / 0.3)` (semi-transparent orange)

