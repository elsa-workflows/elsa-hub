
# Add Provider Listing Layer for Expert Services

## Overview
Insert a new "provider listing" page between the Elsa+ category card and the provider-specific details page. When a user clicks "Expert Advisory & Engineering", they first see a list of available providers (fetched from the `service_providers` table). Clicking a provider then navigates to that provider's detail page.

---

## Routing Changes

```text
Current:  /elsa-plus/expert-services  -->  Valence Works details page

New:      /elsa-plus/expert-services           -->  Provider listing page
          /elsa-plus/expert-services/:slug     -->  Provider detail page (e.g. /elsa-plus/expert-services/valence-works)
```

---

## Implementation

### Step 1: Create Provider Listing Page

**New file: `src/pages/enterprise/ExpertServicesProviders.tsx`**

- Fetches providers from `service_providers` table using Supabase
- Displays each provider as a card showing name, availability status, and a link
- Cards link to `/elsa-plus/expert-services/{slug}`
- Includes breadcrumb: Elsa+ > Expert Services
- Reuses existing `AvailabilityStatusBadge` component for status display

### Step 2: Move Current ExpertServices to Provider-Specific Page

**Rename/refactor: `src/pages/enterprise/ExpertServices.tsx`**

- Rename to a provider-specific component: `src/pages/enterprise/providers/ValenceWorks.tsx`
- Extract the slug from the URL param (`:slug`)
- Update breadcrumb to: Elsa+ > Expert Services > Valence Works
- Keep all existing content and functionality intact

### Step 3: Create Provider Page Router

**New file: `src/pages/enterprise/ExpertServiceProvider.tsx`**

- Reads `:slug` from URL params
- Looks up the provider slug and renders the matching component
- Uses a registry/map pattern:
  ```text
  {
    "valence-works": ValenceWorksPage
  }
  ```
- If slug not found, shows a "Provider not found" message
- This pattern allows future providers to be added as new React components without changing the router

### Step 4: Update Routes in App.tsx

```text
/elsa-plus/expert-services          -->  ExpertServicesProviders (new listing page)
/elsa-plus/expert-services/:slug    -->  ExpertServiceProvider (router component)
```

Keep backward compatibility redirect:
```text
/enterprise/expert-services  -->  /elsa-plus/expert-services
```

### Step 5: Update Internal Links

- `PurchaseBundleDialog.tsx`: Update login redirect URL from `/enterprise/expert-services` to `/elsa-plus/expert-services/valence-works`
- `OrgCredits.tsx`: Update "Purchase Credits" link to `/elsa-plus/expert-services`
- `CloudServices.tsx`: Update cross-link to `/elsa-plus/expert-services`

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/pages/enterprise/ExpertServicesProviders.tsx` | Create | New provider listing page with data-driven cards |
| `src/pages/enterprise/providers/ValenceWorks.tsx` | Create | Move current ExpertServices content here, update breadcrumb |
| `src/pages/enterprise/ExpertServiceProvider.tsx` | Create | Router component that maps slug to provider page component |
| `src/pages/enterprise/ExpertServices.tsx` | Delete | Replaced by the above files |
| `src/App.tsx` | Update | Add new routes for listing and provider detail |
| `src/components/organization/PurchaseBundleDialog.tsx` | Update | Fix redirect URL |
| `src/pages/dashboard/org/OrgCredits.tsx` | Update | Fix purchase link |

---

## Technical Details

### Provider Listing Query

```text
SELECT id, name, slug, logo_url, availability_status
FROM service_providers
```

RLS already allows authenticated users to view providers (`true` using expression), so no policy changes needed.

### Provider Page Registry Pattern

```text
// src/pages/enterprise/ExpertServiceProvider.tsx
const providerPages: Record<string, React.ComponentType> = {
  "valence-works": ValenceWorksPage,
};

// Usage: look up params.slug in the registry
// If not found, render a 404-style message
```

This convention-based approach means adding a new provider requires:
1. Creating a new component in `src/pages/enterprise/providers/`
2. Adding one entry to the registry map

### Provider Card Design

Each card on the listing page will show:
- Provider name (from DB)
- Availability status badge (reusing existing `AvailabilityStatusBadge`)
- Brief description (hardcoded per-provider for now, or a generic one)
- Arrow link to the detail page
