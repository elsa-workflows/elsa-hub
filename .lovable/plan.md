
# Fix Shooting Stars Direction & Reduce Nebulae Visibility

## Overview
Two changes are needed:
1. Reduce the nebulae opacity back to more subtle values
2. Fix the shooting star animation so meteors travel in the direction they're visually oriented

## The Problem with Shooting Stars
Currently, each shooting star is rotated to a certain angle (e.g., 45°), but the CSS animation moves it using `translate(-200vw, 200vh)` which moves in screen coordinates (down-left). This causes the meteor to move diagonally downward regardless of its visual orientation - creating an unrealistic effect where the trail doesn't align with the direction of travel.

## Solution

### 1. Reduce Nebulae Visibility
Revert the nebulae opacity to more subtle values:
- Nebula 1: `opacity-[0.08]` (down from 0.15)
- Nebula 2: `opacity-[0.06]` (down from 0.12)  
- Nebula 3: `opacity-[0.05]` (down from 0.10)
- Restore original blur values for softer appearance

### 2. Fix Shooting Star Direction
Instead of using a CSS keyframe animation with fixed translation values, switch to **inline JavaScript-driven animation** using CSS variables. The key insight is that a meteor moving at angle θ should translate along its own X-axis (in its rotated coordinate system).

**Approach:**
- Keep the rotation transform on the container
- Animate only the `translateX` component (moving "forward" along the meteor's axis)
- Since the element is rotated, moving along its local X-axis will naturally follow the diagonal path

**Updated animation logic:**
```css
@keyframes meteor-fly {
  0% {
    transform: rotate(var(--angle)) translateX(0);
    opacity: 0;
  }
  5% {
    opacity: 1;
  }
  95% {
    opacity: 1;
  }
  100% {
    /* Move along the meteor's own axis (after rotation) */
    transform: rotate(var(--angle)) translateX(-250vw);
    opacity: 0;
  }
}
```

**Component changes:**
- Pass `--angle` as a CSS custom property
- The meteor will now travel in the direction it's facing (top-right to bottom-left along its rotated axis)

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/space/Nebulae.tsx` | Reduce opacity values back to subtle levels |
| `src/index.css` | Update `meteor-fly` keyframes to use `rotate()` + `translateX()` together with CSS variable |
| `src/components/space/ShootingStars.tsx` | Set `--angle` CSS variable on each meteor element |

---

## Technical Details

The fix works because CSS transforms are applied in order. When we write:
```css
transform: rotate(45deg) translateX(-100px);
```
The rotation happens first, then the translation occurs along the **rotated** coordinate system. This means `translateX` moves the element 100px along the direction the element is now facing (45° diagonal), not along the screen's X-axis.
