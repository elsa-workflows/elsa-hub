

## Scroll-triggered slide-in animations

Add subtle reveal animations to cards and sections as they enter the viewport on scroll, using Intersection Observer.

### Approach

1. **Create a reusable `useScrollReveal` hook** — wraps Intersection Observer, returns a ref and `isVisible` boolean. Configurable threshold and optional "once" mode (default: animate once).

2. **Create a `ScrollReveal` wrapper component** — accepts children, animation variant (`fade-up`, `fade-in`, `scale-in`), delay, and duration. Applies CSS transition classes when visible. This keeps usage simple: wrap any element in `<ScrollReveal>`.

3. **Apply to key pages/components**:
   - **Home** — hero sections, feature cards
   - **Enterprise** — `CategoryCard`, `ServiceCard`
   - **Get Started** — `GuideCard`, `PathCard`
   - **Resources** — `CommunityResourceCard`
   - **Elsa Plus** — section cards

4. **CSS** — add a few utility classes in `index.css`:
   - `.scroll-hidden` — `opacity: 0; transform: translateY(20px)`
   - `.scroll-visible` — `opacity: 1; transform: translateY(0)` with transition
   - Staggered delays via `style={{ transitionDelay }}` prop

### Technical details

- No external library needed — native `IntersectionObserver` with `threshold: 0.1`
- `rootMargin: "0px 0px -50px 0px"` so elements animate slightly before fully in view
- Respects `prefers-reduced-motion` — skip animations if enabled
- Stagger support: pass `delay` prop (e.g., `index * 100`) for card grids

