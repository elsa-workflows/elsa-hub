
# Very Distant Meteor Variant

## Overview
Add a rare, ultra-slow shooting star that appears far in the distance, taking 40-60 seconds to cross the screen. It will be small but have a long, delicate tail that creates a beautiful, contemplative moment.

---

## Design Approach

### Visual Properties

| Property | Value | Reasoning |
|----------|-------|-----------|
| Duration | 40-60 seconds | Extremely slow, feels very far away |
| Head size | 1px | Tiny point of light |
| Trail length | 200-350px | Long, elegant tail despite small head |
| Trail thickness | 0.5px | Hairline thin for distant effect |
| Opacity | 0.2-0.35 | Faint but visible |
| Glow | Subtle 4px | Soft, not harsh |

### Spawn Frequency
- Every 90-180 seconds (1.5 to 3 minutes between appearances)
- First appearance: 20-40 seconds after page load
- This makes it a rare, special moment when one appears

### Trajectory
- Same diagonal movement (top-left to bottom-right)
- Slightly shallower angle (20-35°) to emphasize horizontal distance
- Starts from top-left quadrant like other meteors

---

## Technical Implementation

### 1. Update TypeScript Interface

Add new variant to the type union:
```text
variant: "distant" | "closer" | "very-distant"
```

### 2. Add Spawn Logic for Very Distant Meteor

New spawner with 90-180 second intervals:
```text
┌─────────────────────────────────────────┐
│ Initial delay: 20-40 seconds            │
│ ↓                                       │
│ Spawn very-distant meteor               │
│ ↓                                       │
│ Wait 90-180 seconds                     │
│ ↓                                       │
│ Loop back to spawn                      │
└─────────────────────────────────────────┘
```

### 3. Visual Parameters for Very Distant

| Parameter | Very Distant | Distant | Closer |
|-----------|--------------|---------|--------|
| Duration | 40-60s | 3-5s | 1-2s |
| Head | 1px | 2px | 3px |
| Trail | 200-350px | 150-250px | 80-150px |
| Trail height | 0.5px | 1px | 2px |
| Opacity | 0.2-0.35 | 0.4-0.6 | 0.6-0.9 |
| Glow | 4px | 6px | 10px |
| Angle | 20-35° | 30-50° | 40-60° |

### 4. Cleanup Timing

The cleanup timeout needs to account for the longer duration:
```text
duration * 1000 + 500 = up to 60,500ms
```

---

## Debug Panel Enhancement

Add a button to manually trigger the very distant meteor for testing:
```text
{ type: "shooting-star-very-distant", label: "Very Distant Meteor", emoji: "✨" }
```

This will require exposing a global function similar to `spawnCosmicEvent`.

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/space/ShootingStars.tsx` | Update | Add "very-distant" variant with ultra-slow parameters |
| `src/components/space/CosmicEventsDebugPanel.tsx` | Update | Add button to trigger very distant meteor |

---

## Expected Result

Every 1.5-3 minutes, a tiny pinpoint of light with an ethereal, long tail will slowly drift across the screen over 40-60 seconds. It creates a meditative, ambient moment that rewards patient viewers and adds depth to the space experience.
