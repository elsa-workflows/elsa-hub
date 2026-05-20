# Elsa Roadmap page

Add a polished, public `/roadmap` page that surfaces the high-value items from the upstream roadmap issue [`elsa-workflows/elsa-core#3232`](https://github.com/elsa-workflows/elsa-core/issues/3232) (last refreshed 2026-05-19). Content is curated and rewritten for readability — not a verbatim copy — and grouped by the six themes the maintainers use.

## Goals

- Make the project direction visible and skimmable at a glance.
- Distinguish what is shipped vs in-progress vs roadmap candidate.
- Link back to the canonical GitHub issue as the source of truth.
- Match the rest of the site visually (Layout, glass cards, gradient hero, ScrollReveal, semantic tokens).

## Page structure

1. **Hero**
   - H1 "Roadmap", subtitle explaining this is a product direction document, not a release calendar.
   - Small meta row: "Last refreshed May 19, 2026 · Source: GitHub #3232" with external link icon.
   - Two CTAs: "View source on GitHub" (external) and "Join the community" (Discord).

2. **North Star** — short 4-bullet card summarising the maintainer's North Star (productive, dependable, open, powerful).

3. **Status legend** — inline chips explaining the three states:
   - `Shipped` — green
   - `In progress` — amber
   - `Planned` — neutral/primary outline

4. **Themes** — six sections rendered as cards in a 1/2-column responsive grid. Each theme has:
   - Icon + title + one-line goal
   - 4–6 curated high-value items (not the full upstream list), each with a status chip
   - "Why it matters" footer line

   Themes and example items:
   - **Production confidence** (Shield) — graceful shutdown completion, full recovery UX for interrupted/crashed instances, distributed runtime hardening, scheduler/messaging correctness, native workflow-aware background execution, persistence & migration reliability.
   - **Authoring productivity** (Workflow) — workflow organization (labels/folders/search), designer reliability harness, workflow progress/timeline API, state-machine Studio surface, first-class debugging & test runners, user-preference & layout persistence, ElsaScript productization.
   - **Integrations & ecosystem** (Puzzle) — OpenAPI activity provider, connector SDK, marketplace/plugin installation on Nuplane, Agents provider matrix & MCP lifecycle, Azure DevOps / Teams / Google Workspace connectors, data pipeline/ETL primitives, BPMN interoperability.
   - **Observability & operations** (Eye) — OpenTelemetry module + default semantic metrics, Studio diagnostics (live console, structured logs, incident timelines), correlated traces ↔ workflow navigation, clearer execution-history states.
   - **Security, identity & enterprise readiness** (Lock) — canonical OIDC recipes, production security guide, tenant/role-based activity visibility, multi-tenant ergonomics, enterprise deployment checklist, localization & white-label readiness.
   - **AI-assisted workflow engineering** (Sparkles) — AI generation that produces visible activities (not hidden scripts), Elsa MCP/tooling surface, Studio copilot on top of stable authoring contracts, "explain / find risks / suggest tests" assistants, generation paired with validation.

5. **Recommended sequencing** — three small cards (Near term / Mid term / Longer term) with 3–5 bullets each, drawn from the upstream "Recommended Sequencing" section.

6. **Disclaimer + source footer**
   - "Sequencing changes when real-world demand changes. Customer-funded work can accelerate items."
   - Link: "Read the full roadmap on GitHub →"

## Technical notes

- New file `src/pages/Roadmap.tsx` using `Layout`, `Seo`, `ScrollReveal`, `Card variant="glass"`, `Badge`, and lucide icons. No new dependencies.
- New route in `src/App.tsx`: `<Route path="/roadmap" element={<Roadmap />} />`.
- Data lives inline in the page as a typed `themes` array (status: `"shipped" | "in-progress" | "planned"`); easy to update when #3232 is refreshed. No backend, no Catalog API call.
- Add `/roadmap` to `public/sitemap.xml` via the existing `scripts/generate-sitemap.ts` route list.
- Add a "Roadmap" link in `src/components/layout/Footer.tsx` under the existing resources column (and Navigation if there's a Resources menu — to confirm during implementation).
- SEO: title "Roadmap — Elsa Workflows", description summarising the six themes; include `Organization` + `WebPage` JSON-LD.
- Respect dark-mode Noir tokens and glassmorphism rules from project memory. Status chips use `bg-green-500/15 text-green-600 dark:text-green-300`, amber, and `border-border text-muted-foreground` respectively — wrapped in a small local `<StatusBadge>` component.

## Out of scope

- No CMS / DB-driven roadmap (curated inline content for now).
- No voting or upvote UI.
- No deep links to every individual GitHub issue — only the top-level #3232 plus a couple of high-signal ones the maintainer highlighted (e.g. #4833 recovery, #7367 AI generation).
