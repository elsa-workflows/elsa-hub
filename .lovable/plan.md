

## Add DeepWiki Integration for AI-Powered Codebase Exploration

### Overview
Add a link to DeepWiki (`https://deepwiki.com/elsa-workflows/elsa-core`) across the site to help visitors ask questions about the Elsa Core codebase using AI. Given its power as an interactive exploration tool, it should be positioned alongside Documentation links throughout the site.

---

### Recommended Approach

DeepWiki serves a complementary but distinct purpose from Documentation:
- **Documentation** = Curated guides, tutorials, API reference
- **DeepWiki** = AI-powered Q&A for exploring the actual source code

I recommend adding DeepWiki in **strategic high-visibility locations** where developers are already looking for help understanding Elsa:

---

### Changes by Location

#### 1. Main Navigation (Desktop & Mobile)
**File: `src/components/layout/Navigation.tsx`**

Add a "DeepWiki" button next to the "Docs" button in the desktop header:

```text
[Docs] [DeepWiki] [GitHub] ...
```

The button will use a distinctive icon (like `Sparkles` or `BrainCircuit` from lucide-react) to indicate its AI-powered nature.

Also add to mobile menu after "Documentation".

---

#### 2. Dashboard Header
**File: `src/components/dashboard/DashboardHeader.tsx`**

Add DeepWiki link next to the existing "Docs" button for logged-in users.

---

#### 3. Footer Resources Column
**File: `src/components/layout/Footer.tsx`**

Add "DeepWiki AI" to the Resources list, positioned after Documentation:

```text
Resources:
- Documentation
- DeepWiki AI  <-- NEW
- GitHub
- Discord
- NuGet Packages
```

---

#### 4. Resources Page - Primary Resources Section
**File: `src/pages/Resources.tsx`**

Add DeepWiki as a **4th primary resource card** alongside Documentation, GitHub, and Discord. This gives it equal prominence as a core developer resource:

| Icon | Title | Description | CTA |
|------|-------|-------------|-----|
| Sparkles | DeepWiki AI | Ask questions about the Elsa codebase using AI. Explore architecture, patterns, and implementation details. | Explore DeepWiki |

---

#### 5. Home Page - Ecosystem Section
**File: `src/pages/Home.tsx`**

Add DeepWiki as a **4th ecosystem card** (changing from 3-column to 4-column grid on large screens):

| Current | New |
|---------|-----|
| GitHub, Documentation, Community | GitHub, Documentation, DeepWiki, Community |

---

### Visual Treatment

- **Icon**: Use `Sparkles` from lucide-react to convey AI/intelligence
- **Label**: "DeepWiki" or "DeepWiki AI" 
- **Description**: Emphasize "Ask questions about the codebase" or "AI-powered code exploration"

---

### Technical Summary

| File | Change |
|------|--------|
| `src/components/layout/Navigation.tsx` | Add DeepWiki button (desktop + mobile) |
| `src/components/dashboard/DashboardHeader.tsx` | Add DeepWiki button |
| `src/components/layout/Footer.tsx` | Add to Resources list |
| `src/pages/Resources.tsx` | Add as 4th primary resource card |
| `src/pages/Home.tsx` | Add as 4th ecosystem link card |

---

### Result

Visitors will discover DeepWiki in:
- Every page (via navigation header)
- Footer on all pages
- Resources page (prominent card)
- Home page ecosystem section
- Dashboard (for logged-in users)

This ensures maximum visibility for this powerful tool while maintaining consistency with the existing Documentation link placement pattern.

