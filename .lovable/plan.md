

## Update Open Graph Image Meta Tags

### Overview
Update the social media preview image URLs in `index.html` to use the official production domain.

---

### Changes

**File: `index.html`**

Update lines 18 and 22 to replace the Lovable placeholder image with the Elsa logo on the production domain:

| Meta Tag | Current Value | New Value |
|----------|---------------|-----------|
| `og:image` | `https://lovable.dev/opengraph-image-p98pqg.png` | `https://elsa-workflows.io/elsa-logo.png` |
| `twitter:image` | `https://lovable.dev/opengraph-image-p98pqg.png` | `https://elsa-workflows.io/elsa-logo.png` |

---

### Updated Code

```html
<!-- Open Graph (line 18) -->
<meta property="og:image" content="https://elsa-workflows.io/elsa-logo.png" />

<!-- Twitter (line 22) -->
<meta name="twitter:image" content="https://elsa-workflows.io/elsa-logo.png" />
```

---

### Result
When the site is shared on social media platforms (Facebook, Twitter/X, LinkedIn, etc.), the preview will display the Elsa logo instead of the generic Lovable placeholder image.

