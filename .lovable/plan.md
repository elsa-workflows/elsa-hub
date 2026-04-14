

## Consolidation: Priority Support into Valence Works

### Analysis

The current Valence Works page and the Priority Support page share considerable overlap:
- Both describe credit-based pricing (1 credit = 1 hour)
- Both target production teams
- Both cover architecture guidance and issue diagnosis
- The "Retained Advisory" subscription already includes "Priority scheduling"
- Both have similar "what's not included" sections

The Priority Support page adds value with: **response time targets table**, **explicit best-effort SLA framing**, and **clearer production-readiness messaging**.

### Proposed Approach

**Merge Priority Support content into the Valence Works page** rather than maintaining two separate pages. Specifically:

1. **Add a "Priority Support" section** to ValenceWorks.tsx (between "Retained Advisory" and "Not Sure Where to Start?") containing:
   - The response targets table (Critical/High/Normal severity with business-hour targets)
   - The best-effort disclaimer
   - A note that Priority Support is available with Retained Advisory subscriptions or larger credit bundles

2. **Enhance the "Retained Advisory" card** to explicitly mention priority response times as a benefit

3. **Update the "What's Not Included" section** to incorporate the Priority Support transparency points (not 24/7, not managed service, no guaranteed resolution times) — most are already there

4. **Remove the standalone Priority Support page** (`src/pages/elsa-plus/PrioritySupport.tsx`) and its route from `App.tsx`

5. **Update the Elsa+ overview page** (`ElsaPlus.tsx`):
   - Remove the "Priority Support" card from `servicesAndSupport`
   - The expert services card description can be broadened to mention priority support

6. **Add a redirect** from `/elsa-plus/priority-support` to `/elsa-plus/expert-services/valence-works` for any existing links

### Result

One comprehensive Valence Works page that covers expert advisory, credit bundles, retained advisory with priority support, and production readiness — all in one place. No duplication, clearer value proposition.

