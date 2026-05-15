# Promote the Runtime Builder

Add discoverable entry points to `/elsa-plus/runtime-builder` across the site so users naturally find it from navigation, related product pages, and conversion moments.

## 1. Primary navigation (`src/components/layout/Navigation.tsx`)

- Keep top-level items unchanged (Home / Get Started / Elsa+ / Resources) to avoid bloat.
- Add a small **"Runtime Builder"** pill/button next to the Docs/DeepWiki/GitHub cluster on desktop, with a `Sparkles` or `Boxes` icon and a subtle "New" badge. Routes to `/elsa-plus/runtime-builder`.
- In the mobile sheet, add a matching link with the same badge below the main nav items.

## 2. Elsa+ hub (`src/pages/ElsaPlus.tsx`)

- Promote Runtime Builder into the **Runtime & Operations** section as a first-class card (alongside Production Docker Images), with a `Boxes`/`Wand2` icon and a "New" badge. Description: visually compose a production-ready Elsa runtime and download a deployment bundle.

## 3. Docker Images list (`src/pages/enterprise/DockerImages.tsx`)

- Add a banner/CTA strip above or below the image grid: "Not sure which image you need? Compose your runtime visually." → button to `/elsa-plus/runtime-builder`.

## 4. Docker Image detail (`src/pages/enterprise/DockerImageDetail.tsx`)

- Add a contextual callout near the top (after hero, before tabs) for Elsa Pro Server / Elsa Pro Combined: "Use this image in the Runtime Builder to wire it up with PostgreSQL, RabbitMQ, Redis and download a complete deployment bundle." Deep-links to `/elsa-plus/runtime-builder/new?image={slug}` (composer already reads imageId from store; we'll accept the query param as a hint and pre-select if recognized — small additive change in `RuntimeBuilderComposer.tsx`).

## 5. Get Started → Docker (`src/pages/get-started/Docker.tsx`)

- Add a tip card: "Prefer a guided setup? Try the Runtime Builder to generate a tailored docker-compose bundle."

## 6. Home page (`src/pages/Home.tsx`)

- Add a compact secondary CTA in an existing section (not a new hero band) pointing to the Runtime Builder, framed as "Compose your Elsa runtime visually." Keep it understated to not compete with the primary hero.

## 7. Footer (`src/components/layout/Footer.tsx`)

- Add a "Runtime Builder" link under the Elsa+ / Product column.

## 8. Sitemap (`scripts/generate-sitemap.ts` + `public/sitemap.xml`)

- Confirm `/elsa-plus/runtime-builder` is listed (landing only — `/new` is a tool view). Add if missing and regenerate.

## Out of scope

- No changes to the builder's internal UX or data model.
- No new "New" badge component if one already exists — reuse `Badge` from shadcn with a subtle accent variant.
- No backend/auth changes.

## Technical notes

- "New" badge: small `Badge` with `variant="secondary"` plus accent text color, e.g. `bg-primary/10 text-primary`.
- Composer pre-select from query: in `RuntimeBuilderComposer.tsx` read `?image=` once on mount; if it matches a catalog id and store has no image yet, set it.
- All new copy follows project tone: confident, senior, no marketing fluff.
