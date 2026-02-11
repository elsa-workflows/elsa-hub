

# Rename Skywalker Digital to Valence Works

## Overview
Replace all references to "Skywalker Digital" with "Valence Works" across the codebase and database, updating URLs to www.valence.works and the contact email to hello@valence.works.

---

## Changes

### Database Updates (via SQL insert tool)

Update the `service_providers` table and the `notifications` table:

```text
UPDATE service_providers 
SET name = 'Valence Works', slug = 'valence-works' 
WHERE id = '11111111-1111-1111-1111-111111111111';

UPDATE notifications 
SET action_url = REPLACE(action_url, 'skywalker-digital', 'valence-works')
WHERE action_url LIKE '%skywalker-digital%';
```

---

### Code File Changes

| File | Change |
|------|--------|
| `src/pages/enterprise/ExpertServices.tsx` | "Skywalker Digital" -> "Valence Works", URL -> `https://www.valence.works/` |
| `src/pages/enterprise/DockerImages.tsx` | "Skywalker Digital" -> "Valence Works" (2 occurrences in badges/text) |
| `src/components/enterprise/IntroCallIntakeDialog.tsx` | Action URL slug `skywalker-digital` -> `valence-works` |

**Not changed** (and why):
- `src/pages/resources/CommunityContent.tsx` -- references are to author URLs on dev.to (`sfmskywalker`) and medium.com, which are real external links and should stay as-is
- Old migration SQL files -- these are historical and should not be modified

---

### Memory File Updates

| File | Change |
|------|--------|
| `.lovable/memory/features/expert-services-credits/provider-info.md` | Update name, email, URL to Valence Works |
| `.lovable/memory/features/expert-services-credits/provider-info-link.md` | Update name and URL to Valence Works |
| `.lovable/memory/features/organizations/ux-placeholders.md` | Update reference from Skywalker Digital to Valence Works |

