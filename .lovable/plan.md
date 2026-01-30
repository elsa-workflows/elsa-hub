

# Elsa+ Navigation and Page Restructuring

## Overview

Consolidate the current "Enterprise" and "Marketplace" sections into a unified "Elsa+" umbrella. This creates a cohesive ecosystem presentation that feels intentional, calm, and community-oriented rather than sales-driven.

The core workflow engine remains fully open source. Elsa+ represents optional services, tooling, and extensions that add value around it.

---

## Navigation Updates

### Current State
```text
Home | Get Started | Enterprise | Marketplace | Resources
```

### New State
```text
Home | Get Started | Elsa+ | Resources
```

**File to modify:** `src/components/layout/Navigation.tsx`

- Replace `{ label: "Enterprise", to: "/enterprise" }` and `{ label: "Marketplace", to: "/marketplace" }` with a single `{ label: "Elsa+", to: "/elsa-plus" }`
- Keep all other navigation items unchanged (Home, Get Started, Resources, Docs, GitHub)

---

## Route Changes

**File to modify:** `src/App.tsx`

### Routes to Add
| Path | Component | Purpose |
|------|-----------|---------|
| `/elsa-plus` | `ElsaPlus` | New unified landing page |

### Routes to Update (Redirect for backward compatibility)
| Old Path | New Path |
|----------|----------|
| `/enterprise` | Redirect to `/elsa-plus` |
| `/marketplace` | Redirect to `/elsa-plus` |

### Sub-page Routes to Rename
| Old Path | New Path | Notes |
|----------|----------|-------|
| `/enterprise/expert-services` | `/elsa-plus/expert-services` | Active |
| `/enterprise/docker-images` | `/elsa-plus/production-docker` | Renamed |
| `/enterprise/cloud-services` | `/elsa-plus/cloud-services` | Coming soon |
| `/enterprise/training` | `/elsa-plus/training` | Coming soon |

---

## New Elsa+ Landing Page

**File to create:** `src/pages/ElsaPlus.tsx`

### Hero Section

```text
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│                         Elsa [+]                               │
│                                                                │
│   A growing ecosystem of services, tooling, and extensions     │
│   around Elsa Workflows.                                       │
│                                                                │
│   ──────────────────────────────────────────────────────────   │
│                                                                │
│   The core workflow engine remains fully open source and       │
│   community-driven. Elsa+ adds optional services and tooling   │
│   around it.                                                   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Custom Plus Symbol Component

**File to create:** `src/components/elsa-plus/ElsaPlusIcon.tsx`

A custom SVG-based plus symbol that:
- Uses the primary brand color (pink/magenta: `hsl(333 71% 50%)`)
- Features rounded ends suggesting workflow node connections
- Is simple, geometric, and modern
- Scales well from inline text to hero display sizes
- Uses strokeLinecap="round" to echo workflow connection aesthetics

```tsx
// Conceptual SVG structure
<svg viewBox="0 0 24 24">
  <path 
    d="M12 4v16M4 12h16" 
    stroke="currentColor" 
    strokeWidth="3" 
    strokeLinecap="round"
  />
</svg>
```

### Page Sections

#### Section 1: Services & Support

| Card | Description | Status | Link |
|------|-------------|--------|------|
| Expert Advisory & Engineering | Architecture review, workflow design, production troubleshooting, and hands-on pairing with Elsa experts | Active | `/elsa-plus/expert-services` |
| Cloud & Managed Services | Managed workflow engine in the cloud with enterprise-grade hosting and seamless management | Coming Soon | `/elsa-plus/cloud-services` |

#### Section 2: Runtime & Operations

| Card | Description | Status | Link |
|------|-------------|--------|------|
| Production Docker Images | Production-ready container images with regular updates, security patches, and documentation | Coming Soon | `/elsa-plus/production-docker` |

#### Section 3: Learning & Enablement

| Card | Description | Status | Link |
|------|-------------|--------|------|
| Training & Academy | Courses, workshops, and educational resources for teams working with Elsa Workflows | Coming Soon | `/elsa-plus/training` |

#### Section 4: Elsa+ Marketplace

| Card | Description | Status |
|------|-------------|--------|
| Premium Modules | Extend Elsa with powerful modules providing additional activities, connectors, and integrations | Coming Soon |
| Workflow Templates | Battle-tested workflow templates for common business processes and integration patterns | Coming Soon |
| Partners & Services | Connect with certified developers, consultants, and development teams | Coming Soon |

### Neutrality Disclaimer

Updated wording for Elsa+ context:

> Commercial services and offerings listed under Elsa+ are provided by independent companies. Elsa Workflows remains fully open source, vendor-neutral, and community-driven.

---

## Sub-Page Updates

### Breadcrumb Updates

All existing sub-pages need their breadcrumbs updated:

| Page | Current Breadcrumb | New Breadcrumb |
|------|-------------------|----------------|
| ExpertServices | Enterprise > Expert Services | Elsa+ > Expert Services |
| DockerImages | Enterprise > Docker Images | Elsa+ > Production Docker Images |
| CloudServices | (none) | Elsa+ > Cloud & Managed Services |
| Training | Enterprise > Training & Academy | Elsa+ > Training & Academy |

### Title Rename: Docker Images

**File to modify:** `src/pages/enterprise/DockerImages.tsx` (move to `src/pages/elsa-plus/`)

- Change title from "Enterprise Docker Images" to "Production Docker Images"
- Update description to emphasize production-readiness, not company size

---

## File Structure Changes

### Files to Create
| Path | Purpose |
|------|---------|
| `src/pages/ElsaPlus.tsx` | Main Elsa+ landing page |
| `src/components/elsa-plus/ElsaPlusIcon.tsx` | Custom vector plus symbol |
| `src/components/elsa-plus/ElsaPlusSectionCard.tsx` | Section card component |
| `src/components/elsa-plus/index.ts` | Component exports |

### Files to Modify
| Path | Changes |
|------|---------|
| `src/components/layout/Navigation.tsx` | Replace Enterprise + Marketplace with Elsa+ |
| `src/App.tsx` | Update routes, add redirects |
| `src/pages/enterprise/ExpertServices.tsx` | Update breadcrumb to Elsa+ |
| `src/pages/enterprise/DockerImages.tsx` | Rename, update breadcrumb |
| `src/pages/enterprise/CloudServices.tsx` | Update breadcrumb |
| `src/pages/enterprise/Training.tsx` | Update breadcrumb |

### Files to Delete (optional, can keep as redirects)
- `src/pages/Enterprise.tsx` (content moved to ElsaPlus.tsx)
- `src/pages/Marketplace.tsx` (content moved to ElsaPlus.tsx)

---

## Component Architecture

### ElsaPlusIcon Props

```typescript
interface ElsaPlusIconProps {
  size?: 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
}
```

| Size | Dimensions | Usage |
|------|------------|-------|
| sm | 16x16 | Inline with text |
| md | 24x24 | Navigation, badges |
| lg | 32x32 | Section headers |
| hero | 48x48 | Landing page title |

### ElsaPlusSectionCard Props

```typescript
interface ElsaPlusSectionCardProps {
  title: string;
  intro: string;
  cards: Array<{
    title: string;
    description: string;
    icon: LucideIcon;
    href?: string;
    comingSoon?: boolean;
  }>;
}
```

---

## Design Tokens

Reuse existing design system tokens:

| Element | Token |
|---------|-------|
| Plus symbol stroke | `text-primary` (pink/magenta) |
| Section backgrounds | Alternating `bg-transparent` and `bg-surface-subtle` |
| Coming soon badges | `Badge variant="secondary"` |
| Card hover states | Existing `CategoryCard` patterns |

---

## Implementation Sequence

1. Create `ElsaPlusIcon` component with custom vector plus
2. Create `ElsaPlusSectionCard` component for section layouts
3. Create main `ElsaPlus.tsx` page combining all sections
4. Update `Navigation.tsx` to replace Enterprise + Marketplace
5. Update `App.tsx` routes and add redirects
6. Update breadcrumbs in all sub-pages
7. Rename Docker Images page title
8. Test all navigation flows and redirects

