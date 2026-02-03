
# Replace Mailto Links with Newsletter Signup Form

## Overview
Update all pages that currently use `mailto:` links for "Notify Me", "Request Early Access", "Express Vendor Interest", and similar CTAs to instead open the `NewsletterSubscribeDialog` component. This provides a better user experience and consolidates all interest signups into the newsletter system.

---

## Pages to Update

### 1. Marketplace.tsx
**Current:** Two mailto links for "Request Early Access" and "Express Vendor Interest"
**Change:** Replace with buttons that open the newsletter dialog

| Button | Current Behavior | New Behavior |
|--------|-----------------|--------------|
| Request Early Access | mailto link | Opens dialog with "Marketplace Early Access" messaging |
| Express Vendor Interest | mailto link | Opens dialog with "Vendor Interest" messaging |

This requires:
- Adding `useState` for dialog open state (2 dialogs or 1 with dynamic content)
- Importing `NewsletterSubscribeDialog`
- Replacing `<a href="mailto:...">` with `onClick` handlers

### 2. ExpertServices.tsx
**Current:** Two mailto links for "Get Started" and "Have Questions?"
**Change:** Replace with buttons that open the newsletter dialog

| Button | Current Behavior | New Behavior |
|--------|-----------------|--------------|
| Get Started | mailto link | Opens dialog with "Expert Services Interest" messaging |
| Have Questions? | mailto link | Opens dialog with "Expert Services Questions" messaging |

### 3. Training.tsx
**Current:** One inline mailto link for "Get in touch" in the providers section
**Change:** Replace with an interactive element that opens the dialog

---

## Implementation Approach

For Marketplace and ExpertServices, I'll use a single dialog with dynamic content based on which button was clicked. This avoids duplicating the dialog component multiple times.

```text
Pattern:
1. Add state: dialogConfig = { open, title, description, ... }
2. Create helper: openDialog(type) that sets appropriate messaging
3. Replace <a href="mailto:..."> with <button onClick={() => openDialog("type")}>
4. Render single NewsletterSubscribeDialog with dynamic props
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/pages/Marketplace.tsx` | Update | Replace 2 mailto links with dialog triggers |
| `src/pages/enterprise/ExpertServices.tsx` | Update | Replace 2 mailto links with dialog triggers |
| `src/pages/enterprise/Training.tsx` | Update | Replace inline mailto link with dialog trigger |

---

## Dialog Messaging

| Page | Trigger | Title | Description |
|------|---------|-------|-------------|
| Marketplace | Request Early Access | Get Early Access | Be the first to know when the Elsa Marketplace launches. |
| Marketplace | Express Vendor Interest | Become a Vendor | Register your interest in offering modules, templates, or services. |
| Expert Services | Get Started | Get Started | Register your interest and we'll be in touch to discuss your needs. |
| Expert Services | Have Questions? | Have Questions? | Leave your details and we'll reach out to answer your questions. |
| Training | Get in touch | Provider Inquiry | Interested in offering Elsa Workflows training? Leave your details. |

---

## Expected Result
All interest/inquiry buttons across the site will open a consistent newsletter signup form instead of launching the user's email client. This captures leads directly and provides a smoother user experience.
