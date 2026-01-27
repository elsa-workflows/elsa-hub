
# Hyperlink Skywalker Digital References

## Overview
Add a hyperlink to "Skywalker Digital" where it appears in prose text on the Expert Services page, while keeping the badge as-is for cleaner visual design.

## Changes

### File: `src/pages/enterprise/ExpertServices.tsx`

**What will be changed:**

1. **Line 139 (Hero paragraph)** - Wrap "Skywalker Digital" in an anchor tag:
   - Current: `Skywalker Digital is here to help.`
   - Updated: Link "Skywalker Digital" to `https://www.skywalker-digital.com/`
   - Style: Use subtle link styling (`underline underline-offset-2` or similar) that fits the muted text context

2. **Line 127-129 (Badge)** - Leave unchanged
   - Badges work best as static labels
   - Hyperlinking would require custom styling that may look awkward
   - The website link in the paragraph provides sufficient discoverability

## Implementation Details

The link will:
- Open in a new tab (`target="_blank"`)
- Include security attributes (`rel="noopener noreferrer"`)
- Use appropriate styling to indicate it's clickable while maintaining the muted foreground color scheme

## Visual Result

The hero section will read:
> "Get expert guidance, unblock your team, and build with confidence. Whether you need architectural clarity, hands-on pairing, or production troubleshooting — [Skywalker Digital](link) is here to help."

The badge above will remain as a static label: `Provided by Skywalker Digital`
