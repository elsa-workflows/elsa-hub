

# Expert Services Page Rework - Implementation Plan

## Overview

Rework the Expert Services page to signal enterprise-grade expertise with correct pricing and firm boundaries. The changes involve copy rewrites, pricing updates (both UI and database), and tone refinement throughout.

## Current State Analysis

**Existing pricing in database:**
- Starter Pack: $400 (5h) - $80/hr
- Growth Pack: $750 (10h) - $75/hr
- Scale Pack: $1,625 (25h) - $65/hr
- Enterprise Pack: $2,750 (50h) - $55/hr
- Ongoing Advisory: €2,000/month (6h) - €333/hr

**Target pricing (all EUR):**
- Starter Pack: €900 (5h) - €180/hr
- Growth Pack: €1,650 (10h) - €165/hr
- Scale Pack: €3,875 (25h) - €155/hr
- Enterprise Pack: €7,500 (50h) - €150/hr
- Retained Advisory: €1,100/month (6h) - €183/hr

---

## Implementation Changes

### 1. Database Migration: Update Bundle Pricing

Create migration to update `credit_bundles` with new pricing:

```sql
-- Update Starter Pack: €900 (5h)
UPDATE credit_bundles SET price_cents = 90000, currency = 'eur',
  description = '€180 per hour. Best for short architectural reviews or focused guidance.'
WHERE name = 'Starter Pack';

-- Update Growth Pack: €1,650 (10h)
UPDATE credit_bundles SET price_cents = 165000, currency = 'eur',
  description = '€165 per hour. Ideal for teams ramping up or validating architectural decisions.'
WHERE name = 'Growth Pack';

-- Update Scale Pack: €3,875 (25h)
UPDATE credit_bundles SET price_cents = 387500, currency = 'eur',
  description = '€155 per hour. Designed for ongoing projects and deeper technical collaboration.'
WHERE name = 'Scale Pack';

-- Update Enterprise Pack: €7,500 (50h)
UPDATE credit_bundles SET price_cents = 750000, currency = 'eur',
  description = '€150 per hour (maximum volume discount). Best suited for larger teams and longer-running initiatives.'
WHERE name = 'Enterprise Pack';

-- Update subscription: €1,100/month (rename to Retained Advisory)
UPDATE credit_bundles SET price_cents = 110000, name = 'Retained Advisory',
  description = 'Priority scheduling, async Q&A access, continuity and retained architectural context.'
WHERE billing_type = 'recurring';
```

---

### 2. Hero Section Rewrite

**File:** `src/pages/enterprise/ExpertServices.tsx` (lines 148-168)

Replace current hero with cleaner, more confident copy:

```tsx
{/* Hero */}
<section className="py-12 md:py-20 bg-gradient-to-b from-primary/5 to-transparent">
  <div className="container">
    <div className="max-w-3xl mx-auto text-center">
      <h1 className="text-4xl md:text-5xl font-bold mb-6">
        Elsa Workflows Expert Services
      </h1>
      <p className="text-xl text-muted-foreground mb-4">
        Direct access to the creator and core maintainer of Elsa Workflows.
      </p>
      <p className="text-lg text-muted-foreground">
        Get focused, senior-level guidance to design, extend, and operate Elsa Workflows 
        in real-world systems. Whether you need architectural clarity, hands-on pairing, 
        or help unblocking production issues,{" "}
        <a href="https://www.skywalker-digital.com/" target="_blank" rel="noopener noreferrer" 
           className="underline underline-offset-2 hover:text-foreground transition-colors">
          Skywalker Digital
        </a>{" "}
        provides expert support grounded in deep knowledge of Elsa's internals and real-world usage.
      </p>
    </div>
  </div>
</section>
```

**Changes:**
- Remove `Badge` component (no need for "Provided by Skywalker Digital" badge)
- Cleaner headline without fluff
- Stronger, more authoritative subheadline
- Improved intro paragraph emphasizing senior expertise

---

### 3. "Who This Service Is For" - Tighten Copy

**File:** `src/pages/enterprise/ExpertServices.tsx` (lines 47-57, 180-205)

Update the data arrays:

```tsx
const forWhom = [
  "Teams using Elsa Workflows in real applications",
  "Organizations preparing for or running Elsa in production",
  "Developers facing non-trivial workflow, orchestration, or architectural challenges",
];

const notForWhom = [
  "Hobby projects or casual experimentation",
  "General .NET mentoring unrelated to Elsa Workflows",
  "Staff augmentation or long-term team replacement",
];
```

Update section headers:

```tsx
<h3 className="text-lg font-semibold mb-6 text-foreground">
  This service is intended for:
</h3>
// ... list ...

<h3 className="text-lg font-semibold mb-6 text-foreground">
  This service is not intended for:
</h3>
```

---

### 4. "What This Service Covers" - Add Framing

**File:** `src/pages/enterprise/ExpertServices.tsx` (lines 218-219)

Update the description text:

```tsx
<p className="text-muted-foreground text-center mb-12">
  The following are common areas of engagement. This list is illustrative, not exhaustive.
</p>
```

---

### 5. Service Credits Section - Refine Copy

**File:** `src/pages/enterprise/ExpertServices.tsx` (lines 247-251)

Update the description:

```tsx
<p className="text-muted-foreground mb-6">
  All services are delivered using prepaid Service Credits, allowing flexible use 
  across different engagement types.
</p>
```

---

### 6. Pricing Section - Major Overhaul

**File:** `src/pages/enterprise/ExpertServices.tsx` (lines 292-358)

**Key changes:**
- Remove "Sandbox" badge entirely
- Remove "Payments are currently in test mode" text
- Update section title to just "Service Credit Bundles"
- Add pricing notes after the bundle grid
- Display per-hour rate on each card

Updated bundle cards to show per-hour rate:

```tsx
<Card key={bundle.id} ...>
  <CardHeader className="text-center pb-2">
    <CardTitle className="text-lg">{bundle.name}</CardTitle>
  </CardHeader>
  <CardContent className="text-center">
    <div className="mb-2">
      <span className="text-3xl font-bold">
        {formatPrice(bundle.price_cents, bundle.currency)}
      </span>
    </div>
    <p className="text-xl font-semibold text-primary mb-2">
      {bundle.hours} Service Credits
    </p>
    <p className="text-muted-foreground text-sm">
      {bundle.description}
    </p>
  </CardContent>
</Card>
```

Add pricing notes after the grid:

```tsx
<div className="mt-8 text-center text-sm text-muted-foreground space-y-1">
  <p>All prices exclude VAT where applicable.</p>
  <p>Service Credits are prepaid and non-refundable.</p>
  <p>Discounts apply only through bundles.</p>
</div>
```

---

### 7. Subscription Section - Major Fix

**File:** `src/pages/enterprise/ExpertServices.tsx` (lines 360-422)

**Changes:**
- Remove "Sandbox" badge
- Update title to "Retained Advisory"
- Update description and benefits list
- Add notes about unused credits and extras

```tsx
<section className="py-16 md:py-24">
  <div className="container">
    <div className="max-w-4xl mx-auto">
      <Card className="border-2 border-primary/30 cursor-pointer transition-all hover:border-primary hover:shadow-lg"
            onClick={() => handleBundleClick(subscriptionBundle.id)}>
        <CardContent className="p-8 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">Subscription</Badge>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Retained Advisory
              </h2>
              <p className="text-muted-foreground mb-6">
                For teams running Elsa Workflows in production who want continuity, 
                retained context, and priority access.
              </p>
              <div className="text-3xl font-bold">
                {formatPrice(subscriptionBundle.price_cents, subscriptionBundle.currency)}
                <span className="text-lg font-normal text-muted-foreground">
                  /{subscriptionBundle.recurring_interval}
                </span>
              </div>
            </div>
            <div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{subscriptionBundle.monthly_hours} Service Credits per month</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Priority scheduling</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Asynchronous Q&A access</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Continuity and retained architectural context</span>
                </li>
              </ul>
              <div className="mt-6 text-sm text-muted-foreground space-y-1">
                <p>Unused credits expire monthly.</p>
                <p>Additional Service Credits can be purchased separately.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</section>
```

---

### 8. Working Together Section - Small Tweak

**File:** `src/pages/enterprise/ExpertServices.tsx` (lines 66-70)

Update the first item in `howWeWork` array:

```tsx
const howWeWork = [
  "Engagements are collaborative and focused on enablement, not replacement",
  "Guidance, reviews, and proof-of-concepts",
  "Pair programming with explanation",
  "Repository access for troubleshooting when needed",
];
```

---

### 9. Urgent Support Note - Reframe

**File:** `src/pages/enterprise/ExpertServices.tsx` (lines 460-470)

Update the text to feel intentional:

```tsx
<div className="mt-12 p-6 rounded-lg bg-background border flex items-start gap-4">
  <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
  <div>
    <p className="font-medium mb-1">Urgent / After-Hours Support</p>
    <p className="text-sm text-muted-foreground">
      Urgent or after-hours support for production-blocking issues may be available 
      on a best-effort basis and is billed at 2× the standard hourly rate, subject to availability.
    </p>
  </div>
</div>
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx.sql` | Create | Update bundle pricing and descriptions |
| `src/pages/enterprise/ExpertServices.tsx` | Update | Hero rewrite, copy tightening, pricing section overhaul, subscription fix |

---

## Implementation Order

1. Create database migration for bundle pricing updates
2. Update ExpertServices.tsx with all copy changes
3. Verify pricing displays correctly with EUR currency

---

## Visual Summary of Pricing Changes

| Bundle | Current | New |
|--------|---------|-----|
| Starter (5h) | $400 ($80/hr) | €900 (€180/hr) |
| Growth (10h) | $750 ($75/hr) | €1,650 (€165/hr) |
| Scale (25h) | $1,625 ($65/hr) | €3,875 (€155/hr) |
| Enterprise (50h) | $2,750 ($55/hr) | €7,500 (€150/hr) |
| Subscription (6h/mo) | €2,000/mo (€333/hr) | €1,100/mo (€183/hr) |

