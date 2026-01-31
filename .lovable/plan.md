
## Subtle Glow Effect for Primary Buttons and Links in Dark Mode

Add a dramatic yet tasteful glow effect to primary buttons and links that only appears in dark mode, enhancing the "forbidden passion" aesthetic.

---

### Approach

Use CSS `box-shadow` for buttons and `text-shadow` for links to create a soft pink glow. The glow will:
- Only activate in dark mode (using `.dark` selector)
- Use the primary pink color for consistency
- Include a subtle hover enhancement for interactivity
- Transition smoothly for a polished feel

---

### Implementation

| Element | Effect | CSS Property |
|---------|--------|--------------|
| Primary buttons | Soft pink aura around the button | `box-shadow` with primary color |
| Primary buttons (hover) | Intensified glow on hover | Enhanced `box-shadow` |
| Primary links | Subtle text glow | `text-shadow` with primary color |

---

### Technical Details

**Button Glow (box-shadow):**
```css
.dark .btn-primary-glow {
  box-shadow: 0 0 20px hsl(340 90% 70% / 0.3),
              0 0 40px hsl(340 90% 70% / 0.1);
}

.dark .btn-primary-glow:hover {
  box-shadow: 0 0 25px hsl(340 90% 70% / 0.4),
              0 0 50px hsl(340 90% 70% / 0.2);
}
```

**Link Glow (text-shadow):**
```css
.dark .link-primary-glow {
  text-shadow: 0 0 10px hsl(340 90% 70% / 0.5);
}
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/index.css` | Add new utility classes for glow effects in dark mode |
| `src/components/ui/button.tsx` | Add dark mode glow classes to the default variant |

---

### Result

Primary buttons will have a soft, ethereal pink glow radiating outward against the noir background. On hover, the glow intensifies slightly, creating an inviting interactive effect. Links get a subtle text glow that makes them pop without being distracting.

The effect is:
- **Subtle** - Not overwhelming, just enough to add drama
- **Performant** - CSS-only, no JavaScript
- **Scoped** - Only applies in dark mode
- **Interactive** - Enhanced on hover for feedback
