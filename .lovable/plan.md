## Goal

Give providers on `/elsa-plus/expert-services` real presence. Replace the horizontal thin rows with large square tiles where the provider's logo is the hero, backed by a distinctive branded surface.

## Assets to add

Copy Valence Works's updated branding from the sibling project (`91e636ed-cbe0-4905-8bc4-26ef06811f91`) into `src/assets/providers/`:

- `valence-works-logo.svg` (primary wordmark, light backgrounds)
- `valence-works-logo-dark.svg` (wordmark for dark backgrounds)
- `valence-works-mark.svg` (icon-only mark, used as a subtle backdrop watermark)

The DB column `service_providers.logo_url` currently stores a bitmap. We'll keep DB values untouched and, for known slugs, prefer the local SVGs (mapped by slug in a small `providerBrandAssets` object). Unknown providers fall back to `logo_url` or a generic icon — behavior unchanged for them.

## New tile design

Layout on `/elsa-plus/expert-services`:

- Responsive grid: 1 col mobile, 2 col md, 2–3 col lg (keeps tiles large; we only have one provider today, so a single centered tile with `max-w-md` when count === 1).
- Each tile is a ~square card (`aspect-[4/5]` on mobile, `aspect-square` md+), variant `glass`, hairline border, generous padding.

Tile anatomy, top → bottom:

1. **Brand canvas** (top ~55%): a soft branded surface — subtle radial gradient using the provider's accent (default: primary/8 → primary/0), with the icon mark rendered large and low-opacity (~8%) as a watermark, top-right. The full wordmark logo sits centered, sized to breathe (max-h ~72px, dark/light variant chosen via `useIsDark`).
2. **Divider**: hairline `border-t`.
3. **Meta strip**: provider name (sr-only, already in logo) + `AvailabilityStatusBadge` inline with a short tagline ("Expert advisory, engineering & priority support for Elsa Workflows"). One line, muted.
4. **Actions**: primary "View details" button (fills width on mobile, auto md+) with `ArrowRight`. If `booking_url` is set, a secondary outline "Book intro" button with `Calendar`. Buttons live on the card; the whole card is not a `<Link>` anymore so button clicks aren't hacks with `preventDefault` — the tile has an overlay `<Link>` with `aria-label` that sits behind the buttons (buttons use `relative z-10`).

Hover: border becomes `border-primary/60`, shadow lifts (`shadow-lg`), the brand canvas gradient intensifies slightly. No scale transform.

## Files to change

- **New**: `src/assets/providers/valence-works-logo.svg`, `valence-works-logo-dark.svg`, `valence-works-mark.svg` — copied from the Valence Works project.
- **New**: `src/components/enterprise/ProviderTile.tsx` — the tile component described above. Uses `useIsDark` to pick light/dark wordmark, and imports the SVGs so Vite fingerprints them.
- **New**: `src/components/enterprise/providerBrandAssets.ts` — small map `{ [slug]: { logoLight, logoDark, mark, accent? } }`.
- **Edit**: `src/components/enterprise/index.ts` — export `ProviderTile`.
- **Edit**: `src/pages/enterprise/ExpertServicesProviders.tsx`:
  - Replace the vertical `space-y-4` list with the responsive grid described above.
  - Render `<ProviderTile provider={p} />` instead of the inline `Card`.
  - Skeleton state: 2 aspect-square skeleton tiles in the same grid.
  - Keep hero, breadcrumb, and neutrality disclaimer unchanged.

## Out of scope

- No DB changes, no edits to provider records.
- No changes to `/elsa-plus/expert-services/:slug` detail page.
- Provider portal branding upload UI stays as-is.
