# Website engagement & growth roadmap

Grounded in the last 7 days: **1,396 visitors · 55% bounce · 2:19 avg session · 2.85 pages/visit · 87% desktop**. Top funnel: Home → Get Started → Elsa+ → Resources. Top sources: Google + Direct + GitHub + ChatGPT. Below is a prioritized roadmap, smallest-bet-first.

---

## Phase 1 — Quick wins (low effort, immediate lift)

Goal: cut bounce on Home and pull more visitors into Get Started / Weaver.

1. **Sticky primary CTA on Home hero** — single "Start in 60 seconds" button that scrolls to a condensed quickstart block (npm/docker one-liner + copy button). Reduce visual competition with secondary links.
2. **Weaver entry point on every public page** — small floating "Ask Weaver about Elsa" pill (already exists in dashboard area). Visitors landing from ChatGPT/Google expect an "ask anything" affordance. Track opens as engagement events.
3. **Reading-time + "What's next" footer on blog posts and Get Started pages** — auto-suggest 2 related posts (same tag) + 1 logical next step (e.g. Docker → Elsa Server). Should measurably lift pages/visit.
4. **Inline newsletter capture mid-content** (not just footer) — one tasteful block on Home, Blog index, and end of each post. Reuses existing MailerLite component.
5. **Scroll progress + anchor TOC on long pages** (Get Started subpages, Resources, blog posts) — keeps people oriented, signals depth.
6. **Replace dead-ends with next-step cards** — at bottom of `/elsa-plus`, `/resources`, `/blog`: 3 cards routing to the next likely page based on intent.

## Phase 2 — Homepage as a story (mid effort, biggest engagement lever)

Bounce is concentrated on `/`. Make the homepage answer "what is this and why should I care" in 10 seconds and "show me" in 30.

7. **Interactive hero demo** — small embedded workflow visualizer that auto-plays a 3-step workflow (HTTP trigger → activity → response). No click required to see value. Pause on hover.
8. **"Built with Elsa" social proof strip** — logos / community stats (GitHub stars, npm downloads, contributors, Discord members) pulled live where possible.
9. **Use-case switcher** — tabs like *Background jobs · Approval flows · AI agents · Integrations* each revealing a short code/diagram snippet. Lets visitors self-identify.
10. **Comparison block** — calm, factual "Elsa vs hand-rolled state machines / Temporal / n8n" table. Visitors from Google searches are usually evaluating; not addressing this sends them back to SERPs.
11. **Trim Why-Elsa cards if list gets long** — keep 6 strongest; surface "MIT Open Source" + "Production-ready" near the top.

## Phase 3 — Content depth & SEO compounding

`/blog` only got 43 views vs `/get-started` 456 — the content engine is underused. Google is the #1 source, so depth here compounds.

12. **Blog index upgrade** — featured post, search box, tag cloud sidebar (already have tag filtering), author filter, sort by recent/popular.
13. **Tag hub pages** with real intros (`/blog?tag=x` → render an SEO-friendly description, FAQ section, related Get Started link). Targets long-tail keywords.
14. **"Learning paths" on /resources** — curated sequences: *Beginner*, *Building production workflows*, *AI agent workflows*. Each path is a numbered checklist of blog posts + docs links + sample repos.
15. **Code playground / sample repo gallery** — embedded snippets with copy buttons; link to runnable StackBlitz/sample repos. Engineers stay longer when they can poke at code.
16. **JSON-LD Article schema** on blog posts + breadcrumbs everywhere — small SEO multiplier.

## Phase 4 — Lead capture & community growth

17. **Community bar in footer** — GitHub, Discord, Newsletter, YouTube with live counts. Currently underexposed.
18. **Exit-intent newsletter modal** (desktop only, once per 30 days) — offer "Monthly Elsa digest: releases, samples, articles." Honor a dismiss cookie.
19. **Gated long-form content** (optional) — e.g. "Elsa Production Checklist (PDF)" in exchange for email. Only if you're comfortable; otherwise skip.
20. **Discord/GitHub Star prompts contextually placed** — after a successful Get Started step, after reading a blog post.
21. **"Office hours" / monthly community call** announcement strip — recurring engagement hook for returning visitors.

## Phase 5 — Measurement & iteration

22. **Event tracking** for: hero CTA click, Weaver open, newsletter submit, code-copy clicks, tag clicks, "next step" card clicks. Without these, we can't prove lift.
23. **Two A/B tests to start** — (a) hero variant: static screenshot vs interactive demo; (b) blog post footer: related-posts vs related-posts + newsletter.
24. **Mobile pass** — only 13% mobile but bounce likely higher. Audit hero, Get Started, and Pipeline on mobile after Phase 1 changes.
25. **Monthly analytics review** — track bounce, session length, pages/visit, newsletter conversion, Weaver chat opens.

---

## What I'd build first (recommended order)

If you want a concrete starting batch, I'd ship in this order — each step is a small, shippable PR:

```text
Step 1  Sticky hero CTA + condensed quickstart       (Phase 1.1)
Step 2  "What's next" footer on blog + Get Started   (Phase 1.3)
Step 3  Inline newsletter capture                    (Phase 1.4)
Step 4  Blog index upgrade (search + featured)       (Phase 3.12)
Step 5  Use-case switcher on homepage                (Phase 2.9)
Step 6  Comparison block on homepage                 (Phase 2.10)
Step 7  Learning paths on /resources                 (Phase 3.14)
Step 8  Event tracking + first A/B test              (Phase 5.22)
```

## Technical notes

- All new UI uses existing semantic tokens (magenta brand, Inter/Sora, hairline borders, restrained shadows). No glassmorphism, no glow, per brand rules.
- Reuse existing components: `Newsletter` (MailerLite), `ScrollReveal`, `Weaver` chat trigger, `Badge`, `Card`.
- Analytics events fire client-side; no schema changes required for Phase 1–3.
- Phase 4 gated content + exit-intent: add `localStorage` dismiss keys; no backend changes.
- Comparison and use-case content lives as plain TSX data arrays — easy to edit.
- Tag hub pages can stay on `/blog?tag=x` (current pattern) with enhanced metadata, or upgrade to `/blog/tag/[slug]` static routes if SEO is the priority.

## Out of scope

- Redesigning the brand or color system.
- Replacing MailerLite or the existing Weaver/edge-function stack.
- Changes to the authenticated dashboard, purchasing, or Elsa+ commercial flows.

---

Pick the slice you want and I'll implement it. Easiest place to start: **Steps 1–3** as a single follow-up — visible lift, tiny surface area.
