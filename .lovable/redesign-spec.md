# Elsa Workflows — Redesign Specification (Phase 2, corrected)

Input: approved Website & Codebase Audit + product-owner corrections.
This document supersedes prior drafts. Any previous statement that conflicts with the sections below is void.

---

## 1. Product & brand architecture (authoritative)

### Elsa Workflows
Open-source project and umbrella product family (MIT-licensed unless noted otherwise per component). Includes:

- Elsa runtime and core NuGet packages
- Elsa Server
- Elsa Studio
- Elsa Integrations
- **Elsa Platform** — open source, currently Preview
- **Runtime Builder** — Preview capability within Elsa Platform
- Documentation, samples, community, blog, roadmap

Elsa Workflows remains open source, vendor-neutral, and community-driven.

### Elsa Platform
- License: MIT open source.
- Status: **Preview**, under active development.
- Do not label as commercial, proprietary, GA, or production-ready.
- Primary CTAs: "Explore the project", "View the roadmap", "View on GitHub".
- Commercially supported builds, hosting, or consulting around Elsa Platform may appear later as Elsa+ provider offerings, but the software itself is OSS.

### Runtime Builder
- Open-source Preview capability inside Elsa Platform.
- The hosted Runtime Builder experience on elsaworkflows.io may be listed under Elsa+, but public copy must distinguish the OSS capability from any hosted/commercial service around it.
- Never describe Runtime Builder itself as proprietary.

### Elsa+
Optional ecosystem of provider-labelled products and services around Elsa Workflows.

- **Not** exclusively "operated by Valence Works". Every offering identifies its provider.
- Examples: Docker images (Valence Works), Expert Services, Priority Support, Training, Managed Hosting, future supported distributions, future hosted/supported Elsa Platform offerings.
- Vendor-neutral principle retained: commercial providers are not endorsed by the .NET Foundation unless explicitly stated.

---

## 2. Maturity & availability decisions

| Item | Status | Public labels |
|---|---|---|
| Elsa Core / Server / Studio / Integrations | GA (MIT) | none required |
| Elsa Platform | Open source, **Preview** | "Open source", "Preview" |
| Runtime Builder | Open source, **Preview** (OSS capability); Preview (hosted) | "Preview" |
| Valence Works Docker images (Server / Studio / Combined) | Available, **Early Preview** | "Provided by Valence Works", "Early Preview", "Free to try", "MIT-licensed source" where accurate |
| Cloud Services | State accurately (in development / coming) — no promises | none until real availability |
| Training | State accurately | none until real availability |

Banned marketing terms unless a real, signed offering justifies them: "Production-ready", "Supported distribution", "Hardened", "Enterprise-grade", "GA", "Generally available", "Buy now" (for OSS).

Correct existing "production-ready" and "hardened" copy across the site and, where this project controls the wording, in repository-facing surfaces.

---

## 3. Resolved decisions

1. Elsa Platform: Preview, OSS.
2. Docker images: Early Preview, not supported distributions.
3. No separate marketplace page. `/marketplace` remains a redirect to `/elsa-plus`.
4. Weaver stays publicly available but quiet:
   - Not in primary navigation.
   - Not promoted in hero.
   - Lazy-loaded heavy UI.
   - Small secondary utility pill (not a bright primary CTA). Label: "Ask Weaver".
   - Prefer surfacing on content-heavy routes (Blog, Resources).
5. `/enterprise/*` compatibility aliases retained indefinitely. Hosting-level 301s where the platform supports them; where only client redirects exist, use route aliases and canonical metadata. React Router `<Navigate>` is not an HTTP 301 — do not describe it as one.
6. No customer logos in this implementation. Trust strip uses verified GitHub / NuGet / contributor / release / community metrics only. No invented "anonymous customer" categories.
7. Company is not in primary navigation. About, governance, contact, provider disclosures, and legal live in the footer.

---

## 4. Navigation (public site)

Four primary categories + utility area.

**Product**
- Overview (`/`)
- Embed Elsa (deferred until real content exists — otherwise link to Get Started)
- Deploy Elsa (deferred until real content exists — otherwise link to Get Started)
- Features (`/features`)
- Elsa Platform — Preview (`/elsa-plus/platform`)

*Architecture and Operations pages are added only when they contain complete, verified content.*

**Developers**
- Get Started (`/get-started`)
- Documentation (docs.elsaworkflows.io)
- GitHub (elsa-workflows/elsa-core)

*No dead or placeholder links.*

**Community**
- Blog (`/blog`)
- Roadmap (`/roadmap`)
- Discord
- Radar (`/community/radar`)
- Resources (`/resources`)

**Elsa+**
- Overview (`/elsa-plus`)
- Docker Images — Early Preview (`/elsa-plus/docker-images`)
- Runtime Builder — Preview (`/elsa-plus/runtime-builder`)
- Expert Services (`/elsa-plus/expert-services`)
- Training (`/elsa-plus/training`)
- Cloud Services (only when availability is accurately stated)

**Utility area**
- Docs, GitHub, simple light/dark theme toggle, Sign in (secondary), Get Started (primary).
- Detailed theme/font preferences control removed from the public header; may remain in authenticated settings.

---

## 5. Homepage structure (max 8 sections)

1. **Hero + trust strip**
   - Eyebrow: "Open-source workflow infrastructure for .NET"
   - Headline: "Build, run, and operate workflows in your .NET stack."
   - Body: Elsa gives .NET teams an embeddable workflow engine and a deployable Server and Studio for building long-running, event-driven and scheduled processes.
   - Primary CTA: **Get started** → `/get-started`
   - Secondary CTA: **Read the docs** → docs.elsaworkflows.io
   - Visual: real Elsa Studio screenshot. No animated graphs, pinging dots, gradient blobs, tilts, three-CTA rows, long benefit checklists.
   - Trust strip: verified public metrics only (GitHub stars, NuGet downloads, contributors, latest release, Discord members).

2. **Embed or deploy** — two adoption models presented in parallel, with real code snippet and real Docker snippet. No implication that Deploy requires Elsa+ or a commercial licence.

3. **Build → Run → Operate** — three subsections, each carrying authentic evidence (screenshots when real, otherwise short factual copy). Only verified operational capabilities. No public "Verified" badges.

4. **Production & architecture credibility** — deployment ownership, persistence, extensibility, observability. No unverified claims (no HA, recovery automation, security hardening, distributed execution guarantees).

5. **Developer experience & use cases** — best real code examples + use cases, prefer a compact static layout over a heavy tab system.

6. **Mission & open source** — MIT licensing, extension points, vendor neutrality. Mission copy:
   > **Our mission**
   > We empower .NET teams to build, run, and operate resilient, observable workflow automation with confidence.
   > Workflow automation should be a natural part of a team's applications, architecture, deployment practices and operational tooling. Elsa gives developers the flexibility to embed workflow capabilities inside their software or deploy them as a standalone system—without surrendering control over infrastructure or application design.

7. **Community & roadmap** — restrained combined block for Blog / Roadmap / Discord / Resources / Radar. Not a four-glass-card recreation of the current ecosystem grid.

8. **Elsa+ disclosure + final CTA** — one calm paragraph:
   > Elsa+ lists optional provider-backed products and services around Elsa Workflows. Elsa Workflows itself remains open source and vendor-neutral.
   > Then: primary **Get started**, secondary **Read the docs**.

---

## 6. Visual direction

Keep:
- Sora display, Inter body, JetBrains Mono for code.
- Solid magenta primary buttons.
- Hairline borders, restrained surfaces, real screenshots, restrained SVG diagrams, strong typography, consistent spacing.

Remove from public marketing routes:
- Space backgrounds, star fields, shooting stars
- Animated workflow graphs
- Pinging status dots, ambient hero animation
- Repeated scroll reveals
- Glass cards as default
- Gradient icon tiles, decorative glows

Motion policy: default to static section rendering. Motion is for functional UI transitions only (menus, tabs, copy confirmation, focus). Respect `prefers-reduced-motion`. Gradients are optional and restrained — a solid primary button is preferred over a gradient button. Do **not** enforce "exactly one gradient".

---

## 7. Route policy

Preserved (source of truth: `src/App.tsx`):

- `/`, `/features`, `/get-started`, `/get-started/*`
- `/community/radar`, `/resources`, `/resources/community-content`, `/blog`, `/blog/:slug`, `/blog/:slug.html`, `/roadmap`
- `/elsa-plus`, `/elsa-plus/expert-services`, `/elsa-plus/expert-services/:slug`, `/elsa-plus/docker-images`, `/elsa-plus/docker-images/:slug`, `/elsa-plus/cloud-services`, `/elsa-plus/training`, `/elsa-plus/runtime-builder`, `/elsa-plus/runtime-builder/new`, `/elsa-plus/platform`, `/elsa-plus/platform/*`
- `/marketplace` → redirect to `/elsa-plus`
- `/enterprise`, `/enterprise/*` → redirect to matching `/elsa-plus/*`
- `/login`, `/signup`, `/signup/confirm-email`, `/auth/callback`, `/invite/:token`, `/unsubscribe/:token`, `/.lovable/oauth/consent`
- Full dashboard tree under `/dashboard`

Do not create `/elsa-plus/marketplace`, `/architecture`, `/operations`, `/embed`, or `/deploy` as stubs. Ship them only when they contain accurate content.

---

## 8. Product-proof rule

- Use the existing real Elsa Studio screenshot for the first release.
- No empty screenshot placeholders.
- Add future operational screenshots only when real captures exist (instance list, execution journal, structured logs, OpenTelemetry traces, Runtime Builder, Elsa Platform deployment views).
- Diagrams must be restrained SVGs of real system relationships, not decorative workflow illustrations.

---

## 9. Implementation slice (this change)

1. This spec updated.
2. Navigation replaced with the four-category structure.
3. Homepage redesigned to the eight-section outline using the real Studio screenshot and no ambient effects.
4. Public ambient space effects and excessive reveal animations removed from `/`.
5. Weaver launcher downgraded to a small secondary utility pill labelled "Ask Weaver".
6. Docker Images page re-positioned as **Early Preview**; "Production-ready" wording removed.
7. Elsa+ overview copy corrected — no "production-ready", no exclusive Valence Works framing.
8. All authentication, dashboard, provider, organisation, and admin functionality untouched.
9. Compatibility routes retained.

Deliberately deferred: `/embed`, `/deploy`, `/architecture`, `/operations`; hosting-level 301s; sitemap regeneration for new routes (none added); customer logos; new operational screenshots.

---

## 10. Known unverified claims (do not restate publicly until confirmed)

High availability guarantees; automatic recovery; security hardening of Docker images; distributed execution guarantees; supported production terms for Elsa Platform or Docker images; performance numbers; specific customer counts. Existing pages that assert any of these must be softened when touched.
