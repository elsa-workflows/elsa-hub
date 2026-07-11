# Elsa Workflows — Redesign Specification (Phase 2)

Input: approved Website & Codebase Audit.
Scope: strategic + structural decisions only. No implementation.

---

## 1. Recommended Product Architecture

### Option A — Two-brand model (RECOMMENDED)

```
Elsa Workflows (umbrella, open source)
├── Elsa Core          — engine, activities, runtime libraries (NuGet)
├── Elsa Server        — hostable API/runtime host
├── Elsa Studio        — Blazor designer + management UI
├── Elsa Integrations  — first-party activity packages
└── Community assets   — docs, samples, blog, roadmap, radar, Discord

Elsa+ (commercial ecosystem, operated by Valence Works)
├── Supported Docker Distributions   — hardened, versioned images
├── Runtime Builder                  — composer for pre-built runtimes (Preview)
├── Elsa Platform                    — control plane for deploy/govern/operate
├── Expert Services                  — advisory, implementation, priority support
├── Training                         — instructor-led / self-paced
└── Cloud Services                   — managed hosting
```

**Advantages:** Two crisp brands. Each has one owner and one URL prefix. Removes the ambiguity around "Elsa Platform vs Elsa+ vs Deploy Elsa". Scales as commercial catalog grows.
**Risks:** Requires disciplined navigation and copy to avoid Elsa+ bleeding into OSS getting-started flows.
**User confusion avoided:** No overlap between "Elsa" and "Elsa Platform". Platform is a *product inside Elsa+*, not a synonym for self-hosting.
**URL impact:** `/elsa-plus/*` retained. `/enterprise/*` retired / merged into `/elsa-plus/*`. `/enterprise/platform/*` → `/elsa-plus/platform/*`.

### Option B — Three-brand model

Separate "Valence Works" as its own visible brand alongside Elsa Workflows and Elsa+.
**Risk:** Adds a third mental model for visitors who came for a .NET workflow engine. Valence Works becomes a footer/legal presence, not a navigation citizen.

### Option C — Single brand ("Elsa") with editions

Collapse everything into "Elsa Open Source" and "Elsa Commercial" tiers.
**Risk:** Reads like a freemium SaaS. Damages OSS trust — the current site's biggest asset. Rejected.

**Recommendation: Option A.** Elsa Workflows is the project. Elsa+ is the commercial catalog. Valence Works is disclosed as the operator of Elsa+ but is not a navigation entity.

---

## 2. Canonical Terminology Glossary

| Term | Definition | OSS / Commercial | Maturity |
|---|---|---|---|
| Elsa Workflows | The open-source project and public brand | OSS | GA |
| Elsa Core | Engine + core runtime NuGet libraries | OSS (MIT) | GA (3.7.x) |
| Elsa Server | Hostable ASP.NET Core host bundling engine + API | OSS (MIT) | GA |
| Elsa Studio | Blazor-based visual designer + management UI | OSS (MIT) | GA |
| Elsa Integrations | First-party activity packages (HTTP, SQL, Kafka, etc.) | OSS (MIT) | Confirm per-package |
| Embed Elsa | Adoption model: consume Elsa as libraries inside your app | OSS | GA |
| Deploy Elsa | Adoption model: run Elsa Server + Studio as a system | OSS | GA |
| Elsa+ | Commercial ecosystem umbrella | Commercial | GA (as catalog) |
| Supported Docker Distributions | Hardened, versioned images with support terms | Commercial | Requires confirmation |
| Runtime Builder | Composer producing pre-configured Elsa runtimes | Commercial | Public Preview |
| Elsa Platform | Control plane for deployment, governance, observability across Elsa runtimes | Commercial | Requires confirmation of maturity |
| Expert Services | Advisory + implementation hours | Commercial | GA |
| Cloud Services | Managed hosting for Elsa | Commercial | Requires confirmation |
| Training | Paid education offerings | Commercial | Requires confirmation |
| Valence Works | Legal entity operating Elsa+ | Commercial | GA |
| Community Radar | Community adoption map | Community | GA |
| Weaver | In-app AI explorer for Elsa docs/blog | Product feature | Preview |

Terms to **stop** using publicly: "Enterprise" (ambiguous), "Elsa Hub" (deprecated), "burn credits" (already banned), "Elsa Server and Studio" as a product name (it's a deployment shape, not a product).

---

## 3. Audience Hierarchy

| # | Audience | Primary question | Desired action | Required evidence | Target page | Likely exit | Current friction |
|---|---|---|---|---|---|---|---|
| 1 | .NET developer evaluating Elsa | "Can I embed this in my app?" | Run it locally in <5 min | Code snippet, NuGet install, running screenshot | `/` → `/get-started` | Docs | Hero doesn't say "embed" |
| 2 | Architect / platform engineer | "Is this production-credible for our stack?" | Read architecture + ops story | Persistence, OTel, HA, security | `/architecture`, `/operations` | Docs, GitHub | No production/architecture page exists |
| 3 | Existing Elsa user | "What changed? Where's X?" | Read release, docs, blog | Release notes, roadmap | `/blog`, `/roadmap`, Docs | Docs | Roadmap card buried |
| 4 | Team wanting ready-to-run distribution | "Can I get a supported image?" | Compare OSS Docker vs supported | Distribution matrix | `/elsa-plus/distributions` | Contact | No comparison exists |
| 5 | Commercial customer | "Manage my account/services" | Sign in | — | `/dashboard` | — | Sign-in is over-weighted in primary nav |
| 6 | Community participant | "How do I contribute / learn / connect?" | Discord, GitHub, blog | — | `/resources`, `/blog`, `/radar` | External | Radar occupies top-level nav |

---

## 4. Proposed Sitemap

| Page | Audience | Primary job | Core message | Primary CTA | Reused? |
|---|---|---|---|---|---|
| `/` Home | 1,2 | Position + route | Open-source workflow infrastructure for .NET | Get started | Rewrite |
| `/embed` | 1 | Explain embed model | Consume Elsa as libraries in your app | Install NuGet | New |
| `/deploy` | 2,4 | Explain deploy model | Run Elsa Server + Studio | Docker quickstart | New |
| `/features` | 1,2 | Capability catalog | What Elsa does | Docs | Retain, prune |
| `/architecture` | 2 | Technical model | How Elsa is built | Docs | New (extract from Features) |
| `/operations` | 2 | Production story | Observability, recovery, HA | Docs | New |
| `/get-started` | 1 | Onboarding hub | Pick your path | Templates / Docker | Retain |
| `/get-started/*` | 1 | Path guides | Step-by-step | Next step | Retain |
| Docs (external) | 1,2,3 | Reference | — | — | External |
| GitHub (external) | 1,3,6 | Source | — | — | External |
| `/blog`, `/blog/:slug` | 3,6 | News/deep dives | — | Subscribe | Retain |
| `/roadmap` | 2,3 | Direction | — | GitHub | Retain |
| `/resources` | 6 | Community assets | — | — | Retain |
| `/radar` | 6 | Adoption map | — | Add location | Retain, demote from top nav |
| `/elsa-plus` | 4,5 | Commercial catalog | Supported ecosystem around Elsa | Explore | Retain |
| `/elsa-plus/distributions` | 4 | Supported images | — | Contact | New (merge from `/enterprise/docker-images`) |
| `/elsa-plus/runtime-builder` | 1,4 | Compose runtimes | Preview | Try | Retain |
| `/elsa-plus/platform` | 2,4 | Control plane | — | Contact | Move from `/enterprise/platform` |
| `/elsa-plus/expert-services` | 5 | Advisory | — | Book intro | Move from `/enterprise/expert-services-providers` |
| `/elsa-plus/cloud` | 4 | Managed hosting | — | Contact | Move from `/enterprise/cloud-services` |
| `/elsa-plus/training` | 5 | Training | — | Contact | Move from `/enterprise/training` |
| `/dashboard/*` | 5 | Account | — | — | Retain |
| `/login`, `/signup` | 5 | Auth | — | — | Retain |
| `/marketplace` | 4 | Bundle catalog | — | Buy | Retain (under Elsa+) |

---

## 5. Current → Proposed Route Map

| Existing | Proposed | Action |
|---|---|---|
| `/` | `/` | Rewrite |
| `/features` | `/features` | Retain, split architecture out |
| `/get-started`, `/get-started/*` | same | Retain |
| `/roadmap` | `/roadmap` | Retain |
| `/blog`, `/blog/:slug` | same | Retain |
| `/resources`, `/resources/community` | `/resources`, `/resources/community` | Retain |
| `/radar` | `/radar` | Retain, remove from top nav |
| `/enterprise` | `/elsa-plus` | 301 redirect |
| `/enterprise/platform`, `/enterprise/platform/*` | `/elsa-plus/platform/*` | 301 redirect |
| `/enterprise/docker-images`, `/enterprise/docker-images/:slug` | `/elsa-plus/distributions[/:slug]` | 301 redirect |
| `/enterprise/expert-services-providers`, `/enterprise/expert-services-providers/:slug` | `/elsa-plus/expert-services[/:slug]` | 301 redirect |
| `/enterprise/cloud-services` | `/elsa-plus/cloud` | 301 redirect |
| `/enterprise/training` | `/elsa-plus/training` | 301 redirect |
| `/enterprise/runtime-builder`, `/elsa-plus/runtime-builder` | `/elsa-plus/runtime-builder` | Consolidate |
| `/elsa-plus`, `/elsa-plus/*` | same | Retain |
| `/marketplace` | `/elsa-plus/marketplace` | 301 (optional; keep `/marketplace` alias) |
| `/account`, `/dashboard/*` | same | Retain |
| `/login`, `/signup`, `/signup/confirm-email`, `/auth/callback` | same | Retain |
| `/accept-invitation`, `/unsubscribe`, `/oauth/consent` | same | Retain |
| — | `/embed` | New |
| — | `/deploy` | New |
| — | `/architecture` | New |
| — | `/operations` | New |

---

## 6. Desktop Navigation

Primary (5 categories, left-aligned):

1. **Product** — Overview `/`, Embed `/embed`, Deploy `/deploy`, Features `/features`, Architecture `/architecture`, Operations `/operations`
2. **Developers** — Get Started, Documentation ↗, GitHub ↗, Integrations, Examples ↗
3. **Community** — Blog, Roadmap, Discord ↗, Radar, Resources
4. **Elsa+** — Overview, Supported Distributions, Runtime Builder (Preview), Elsa Platform, Expert Services, Training, Cloud
5. **Company** *(compact)* — About, Contact (or fold into footer if too thin)

Utility (right-aligned):
- Docs ↗ (text link, always visible)
- GitHub icon (star count optional)
- Theme toggle
- Sign in (ghost button, de-emphasized)
- **Get started** (primary button)

Logged-in variation: replace "Sign in / Get started" with account avatar → menu (Dashboard, Settings, Sign out). Elsa+ dropdown adds "My subscriptions".

Reasoning per category:
- **Product** owns the "what is it" story; separates embed vs deploy explicitly.
- **Developers** groups all hands-on-keyboard destinations, including external.
- **Community** absorbs Blog/Roadmap/Radar/Discord/Resources — resolves the current flat sprawl.
- **Elsa+** kept top-level and visually differentiated (subtle accent, "+" glyph) to preserve OSS/commercial clarity.
- **Company** is thin and can start as a footer-only group; promoted only if content grows.

## 7. Mobile Navigation

Accordion, grouped exactly as desktop. Order: Product → Developers → Community → Elsa+ → Company. Sticky footer inside sheet: Docs ↗ · GitHub ↗ · [Get started]. Sign-in as text link at bottom.

---

## 8. Homepage Section Specification

| # | Section | Purpose | Audience | Core message | Evidence | CTA |
|---|---|---|---|---|---|---|
| 1 | Hero | Position + first CTA | 1,2 | Open-source workflow infrastructure for .NET | Studio screenshot (static) | Get started / Docs |
| 2 | Trust strip | Project credibility | 1,2 | Real projects, real scale | GitHub stars, NuGet downloads, versions, notable users (verified only) | — |
| 3 | Two adoption models | Route by intent | 1,2 | Embed *or* Deploy | Code snippet vs docker command | Embed / Deploy |
| 4 | Build → Run → Operate | Full lifecycle | 1,2 | Elsa spans authoring, execution, and operations | 3 anchored proof visuals | Each links to its page |
| 5 | Production credibility | Convert architects | 2 | Persistence, observability, recovery, security | Verified claim list with badges | Architecture / Operations |
| 6 | Developer experience | Convert developers | 1 | C# first, JSON portable, Studio visual | Code + Studio side-by-side | Docs |
| 7 | Use cases | Concrete applications | 1,2 | What teams build | 4 short scenarios | Features |
| 8 | Open source + extensibility | Reinforce OSS trust | 1,6 | MIT, extension points, community | License, contributors, extension example | GitHub |
| 9 | Community & roadmap | Momentum | 3,6 | Active project, clear direction | Blog latest, roadmap peek | Blog / Roadmap |
| 10 | Elsa+ (soft) | Disclose commercial | 4 | Supported distributions and services exist | One small card | Elsa+ overview |
| 11 | Final CTA | Convert stragglers | 1,2 | Start in 60 seconds | — | Get started / Docs |

Merged vs prior draft: mission line folded into hero eyebrow/subtext; screenshot merged into hero + build/run/operate rather than standalone; Elsa+ demoted to a single restrained card.

---

## 9. Three Hero Directions

### Direction A — Infrastructure framing (RECOMMENDED)

- Eyebrow: **Open-source workflow infrastructure for .NET**
- Headline: **Build, run, and operate workflows in your .NET stack.**
- Sub: Elsa is the workflow engine .NET teams embed in their applications — or deploy as a standalone system — to power long-running, event-driven, and scheduled processes.
- Primary CTA: Get started
- Secondary CTA: Read the docs
- Visual: Static Elsa Studio screenshot, subtle bezel, no animation.
- Strengths: Matches architect vocabulary. Signals lifecycle. Distinguishes from "just an engine".
- Risks: "Infrastructure" is broad; must be tightened by the sub.

### Direction B — Engine framing (SEO retention)

- Eyebrow: **The workflow engine for .NET**
- Headline: **Author in C#, design in Studio, run anywhere .NET runs.**
- Sub: Embed Elsa in your application or deploy the server and designer as a standalone system. Long-running, event-driven, and scheduled workflows — with the persistence, observability, and recovery production requires.
- CTAs: Get started · Documentation
- Visual: Studio screenshot with an inset code snippet.
- Strengths: Preserves current keyword. Familiar.
- Risks: Repeats today's positioning; doesn't advance the story.

### Direction C — Lifecycle framing

- Eyebrow: **Workflow automation for .NET teams**
- Headline: **From first activity to production operations.**
- Sub: Elsa gives .NET teams one open-source foundation to build workflows, run them reliably, and operate them in production.
- CTAs: Get started · See how it runs
- Visual: Triptych — code → Studio → execution journal.
- Strengths: Sells lifecycle explicitly.
- Risks: Loses the word "engine"; weaker on discoverability.

**Recommend Direction A.** Keep Direction B's headline phrasing available as an H2/meta description to retain search alignment.

---

## 10. Adoption-Model Copy Structure

### Embed Elsa in your application
- One-line: **Consume Elsa as libraries and own the surrounding application.**
- Bullets: Your architecture, DI, persistence, auth, and UI. Elsa Core NuGet packages. Extension points for activities, expressions, and stores. Ships with your app.
- Proof: `dotnet add package Elsa` + minimal `Program.cs` snippet.
- CTA: Embed guide → `/embed`

### Deploy Elsa as a workflow system
- One-line: **Run the Elsa Server and Studio as a standalone workflow platform.**
- Bullets: HTTP API, Studio designer, activity catalog, persistence providers. Docker or self-host. Integrates with your systems via HTTP, messaging, and webhooks.
- Proof: `docker run … elsaworkflows/elsa-server-and-studio`.
- CTA: Deploy guide → `/deploy`

Footer note under both: *Both models are open-source and MIT-licensed. Supported distributions, managed hosting, and a control plane are available through [Elsa+](/elsa-plus).*

---

## 11. Build → Run → Operate Structure

- Section eyebrow: **The workflow lifecycle**
- Headline: **One foundation across build, run, and operate.**

| Phase | Message | Evidence | Destination |
|---|---|---|---|
| Build | Author in C#, JSON, or the visual designer. Extend everything. | Studio screenshot + short activity code | `/features`, Docs |
| Run | Short-running, long-running, scheduled, event-driven — durably. | Execution journal / instance list screenshot | `/architecture` |
| Operate | Deploy, observe, diagnose, recover, govern. | OTel trace / logs / recovery UI | `/operations` |

Not three generic icon cards — each phase gets a real product-derived visual and one link.

---

## 12. Product-Proof Capture Plan

| Evidence | Page/Section | Proves | Existing? | New capture? |
|---|---|---|---|---|
| Elsa Studio designer | Hero, Build | Visual authoring | Partial (marketing render) | **Yes — real Studio** |
| Workflow instance list | Run | Runtime state | No | **Yes** |
| Execution journal | Operate | Diagnostics | No | **Yes** |
| Structured log view | Operate | Observability | No | **Yes** |
| OTel trace screenshot | Operate | Distributed tracing | No | **Yes** (Jaeger/Grafana) |
| Suspend + resume timeline | Run | Durable state | No | **Yes** |
| Docker deployment diagram | Deploy | Topology | No | **Yes** (SVG) |
| Embed architecture diagram | Embed | In-process model | No | **Yes** (SVG) |
| Standalone architecture diagram | Deploy | Multi-service model | No | **Yes** (SVG) |
| Runtime Builder composer | Elsa+ RB | Product real | Yes | Refresh |
| Elsa Platform loop | Elsa+ Platform | Control plane | Yes (diagram) | Verify accuracy |
| Custom activity code | Extensibility | Code-level extension | No | **Yes** (snippet) |
| Multitenant config sample | Architecture | Multi-tenancy | No | **Yes** (snippet) |

Prefer <5 high-quality legible screenshots on the homepage over a gallery.

---

## 13. OSS ↔ Commercial Boundary Policy

**Public statement (canonical, ~40 words):**
> Elsa Workflows is an open-source, MIT-licensed project. Elsa+ is a commercial ecosystem operated by Valence Works — supported distributions, a control plane, managed hosting, expert services, and training — built around the same open engine.

**Badges (canonical vocabulary — use exactly these):**
- `Open source` — MIT
- `Elsa+` — commercial
- `Preview` — public but not GA
- `Roadmap` — planned, not yet available
- `Verified` — technically confirmed claim
- `Requires verification` — internal only; never ships to production copy

**Page-level rules:**
- OSS pages (`/`, `/features`, `/embed`, `/deploy`, `/get-started/*`, `/architecture`, `/operations`, `/blog`, `/roadmap`, `/resources`, `/radar`, Docs): no upsell blocks; at most one restrained Elsa+ mention per page.
- Elsa+ pages: must include the ElsaPlusDisclaimer already in the codebase.
- Getting-started pages: **no** commercial CTAs above the fold.
- Docker guide: mention supported distributions once at the bottom, as a link, not a banner.

**Navigation treatment:** Elsa+ dropdown gets an accent tint and a `+` glyph; every commercial page's H1 carries an `Elsa+` badge.

**CTA treatment:** primary CTA on OSS pages is always an OSS action (Get started, Docs, GitHub). Elsa+ CTAs use secondary/ghost styling on OSS pages and primary styling only on Elsa+ pages.

---

## 14. Visual-Direction Specification

- **Typography roles:** Sora (display, H1–H2 only), Inter (body + UI), JetBrains Mono (code, IDs, terminal). Retire other display faces. Max 3 families loaded.
- **Content widths:** narrative 720px; feature grid 1120px; full-bleed only for hero background and one operational diagram.
- **Spacing rhythm:** 8px base. Section vertical padding: 96px desktop / 64px mobile. No section should touch its neighbor without ≥64px gap.
- **Card recipe (single canonical variant):** 1px hairline border (`--border`), no shadow, 24px padding, `--radius: 12px`, hover raises border to `--primary/40` — no lift, no glow, no gradient.
- **Screenshot treatment:** 1px border, 12px radius, `--surface-subtle` frame, no drop shadow, no perspective tilt on the homepage hero. Retire the tilted 3D hero image.
- **Code-block treatment:** monospace, no syntax gradient background, single hairline border, copy button top-right, muted language label top-left.
- **Icon treatment:** Lucide, 1.5px stroke, 20px in-line / 24px in cards. No filled variants. No colored icon backgrounds except for phase markers (Build/Run/Operate).
- **Borders/shadows:** hairline borders everywhere; shadow reserved for modals, popovers, and dropdowns only.
- **Accent-colour usage:** magenta reserved for primary CTA, active nav, focus ring, and phase markers. Never used as a decorative wash on public pages.
- **Dark mode:** deep noir per existing memory; no cosmic background on public pages by default (retain as opt-in setting inside dashboard only).
- **Motion budget:**
  - *Useful:* focus rings, dropdown open/close, tab underline, copy-button confirmation.
  - *Allowed:* one subtle fade-up per section on first view, ≤300ms, gated by `prefers-reduced-motion`.
  - *Disallowed on public site:* animated workflow graphs, pinging status dots, star fields, floating gradient blobs, animated hero backgrounds, letter-by-letter reveals, marquee logos.
- **Gradient budget:** exactly one gradient on the site — the primary CTA button. No hero gradients, no card gradients, no section background gradients.
- **Illustration policy:** no decorative illustrations. All homepage/product visuals must be real product screenshots, code, or architecture diagrams.

**Product-proof rule:** every major visual must demonstrate product, explain architecture, show code, show operations, or clarify an adoption model. Decorative visuals are secondary and must be muted.

---

## 15. Open Decisions (product-owner input required)

| # | Question | Why it matters | Recommendation | Consequence if different |
|---|---|---|---|---|
| 1 | Is "Elsa Platform" GA, beta, or preview? | Determines badge and CTA on `/elsa-plus/platform` | Mark **Preview** unless PM confirms GA | Miscommunicated maturity → churn or lost trust |
| 2 | Are "Supported Docker Distributions" a shipping product today? | Determines whether `/elsa-plus/distributions` sells or waitlists | Assume **waitlist / contact** until confirmed | Overselling a non-existent SKU |
| 3 | Retain `/marketplace` at the top level or move under Elsa+? | Affects nav weight | Move under Elsa+ | Duplicated commercial surface |
| 4 | Keep Weaver visible on public site? | Preview feature affects perceived polish | Keep in-app only, remove from public nav | Public users hit a preview surface unprepared |
| 5 | Retire `/enterprise/*` URLs or dual-serve? | SEO + inbound links | 301 redirect, retire | Loss of link equity if hard-deleted |
| 6 | Which verified customer logos can we publish? | Trust strip integrity | Publish only written-approval logos; otherwise use category labels ("Fortune 500 insurer") | Legal exposure |
| 7 | Company/About page — build now or defer? | Nav category weight | Defer; footer-only | Company category too thin in nav |

Everything else in this spec is a design/IA decision the implementation agent can execute without further input.

---

## 16. Recommended First Implementation Slice

Ship as one coherent release:

1. **Shared public-site primitives** — new Card recipe, screenshot frame, code-block, badge system, section rhythm tokens. No new pages yet.
2. **Navigation** — implement the 5-category nav (desktop + mobile) and utility actions. Move Radar/Blog/Roadmap under Community. De-emphasize Sign in.
3. **Homepage** — rewrite per §8 with Direction A hero. Retire animated graph, gradient blobs, pinging badge, tilted hero screenshot.
4. **Two new stub pages** — `/embed` and `/deploy` (structural sections + placeholder proof). Full content can follow.
5. **Redirects** — `/enterprise/*` → `/elsa-plus/*` per §5. Sitemap regeneration.
6. **Product-proof capture** — commission the 5 highest-priority screenshots (§12): Studio, instance list, execution journal, embed diagram, deploy diagram.

Explicitly **out of scope** for the first slice: `/architecture`, `/operations`, Features rewrite, Elsa+ page redesigns, dashboard changes.

---

## Final Recommendation

**Resolve the seven open decisions in §15 first**, then approve for implementation. Decisions 1, 2, and 6 in particular gate copy on public pages; shipping without them risks either overclaiming commercial maturity or underclaiming verified capabilities. Every other decision in this spec is ready to execute.
