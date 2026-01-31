

## Update Organization Creation Placeholders

### Overview
Replace the "Skywalker Digital" placeholder text in the Create Organization dialog with more generic, user-friendly examples that don't reference any specific company.

### Changes

**File: `src/components/account/CreateOrganizationDialog.tsx`**

Update the two placeholder values:

| Field | Current Placeholder | New Placeholder |
|-------|---------------------|-----------------|
| Organization Name | `Skywalker Digital` | `Acme Corporation` |
| URL Slug | `skywalker-digital` | `acme-corp` |

### Technical Details

The change involves updating lines 88 and 96 of the dialog component:

```tsx
// Line 88 - Organization Name input
placeholder="Acme Corporation"

// Line 96 - URL Slug input  
placeholder="acme-corp"
```

### Why "Acme Corporation"?
- **Universally recognized** as a generic/fictional company name
- **Neutral** - doesn't suggest any real business or service provider
- **Professional** - appropriate for a business context
- **Clear example** - shows the expected format (proper capitalization for name, lowercase-hyphenated for slug)

### Scope
- Single file modification
- No functional changes
- Pure UX improvement

