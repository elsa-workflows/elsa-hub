

# Fix Shooting Star Direction: Top-to-Bottom Diagonal Movement

## The Issue
Currently, meteors are rotating to an angle (30-60°) and then translating along their **negative X-axis** (`translateX(-250vw)`). With a positive rotation angle, this causes them to move **up and to the left** - the opposite of natural meteor behavior.

Real shooting stars appear to fall from the sky, moving diagonally **downward** (typically from upper areas toward lower areas of the screen).

## Solution

To achieve top-to-bottom diagonal movement, we need to adjust both the starting positions and the animation direction:

### 1. Change Starting Positions
- Start meteors primarily from the **top edge** or **left edge** of the screen
- Adjust `startX` to favor the left side (0-80%)
- Keep `startY` near the top (0-30%)

### 2. Fix Animation Direction
Use **positive** `translateX` so the meteor travels **forward-right** along its rotated axis. Combined with a rotation of ~30-60°, this creates a natural top-left to bottom-right diagonal path.

### 3. Adjust Trail Position
The trail should be **behind** the meteor (opposite to direction of travel). Since we're now moving in the positive X direction, the trail should extend to the **left** of the meteor head (which it already does with `right-full`).

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/space/ShootingStars.tsx` | Update starting positions to favor top-left area |
| `src/index.css` | Change `translateX(-250vw)` to `translateX(250vw)` for forward motion |

---

## Technical Details

**Current behavior:**
```
Rotation: 45°, TranslateX: -250vw
→ Meteor moves UP and LEFT (wrong direction)
```

**Fixed behavior:**
```
Rotation: 45°, TranslateX: +250vw  
→ Meteor moves DOWN and RIGHT (natural meteor path)
```

**Starting position changes:**
- `startX`: Now favors left side (0-60%) instead of right side
- `startY`: Constrained to top portion (0-20%) for realistic entry

This creates the classic "shooting star" effect: appearing in the upper portion of the sky and streaking diagonally downward across the screen.

