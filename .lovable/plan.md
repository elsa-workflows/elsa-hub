
# Fix Scroll Position on Route Navigation

## Problem
When navigating between internal pages using React Router, the scroll position remains at the current location instead of resetting to the top of the page. This creates a poor user experience, especially when clicking links from the bottom of a page.

## Solution
Create a `ScrollToTop` component that listens for route changes and scrolls the window to the top whenever the location pathname changes.

## Implementation

### New File: `src/components/ScrollToTop.tsx`

Create a simple component that:
- Uses React Router's `useLocation` hook to detect route changes
- Uses `useEffect` to scroll to top when `pathname` changes
- Returns `null` (renders nothing visible)

```tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
```

### Update: `src/App.tsx`

Add the `ScrollToTop` component inside the `BrowserRouter` (it must be a child of the router to access location):

```tsx
import { ScrollToTop } from "@/components/ScrollToTop";

// Inside BrowserRouter, before Routes:
<BrowserRouter>
  <ScrollToTop />
  <AuthProvider>
    <Routes>
      ...
    </Routes>
  </AuthProvider>
</BrowserRouter>
```

## Why This Approach

- **Simple and reliable** - This pattern is the recommended approach for React Router v6
- **No dependencies** - Uses only React and React Router hooks
- **Minimal footprint** - Single small component with one effect
- **Automatic** - Works globally for all route changes without modifying individual pages

## Files Changed

| File | Change |
|------|--------|
| `src/components/ScrollToTop.tsx` | New file |
| `src/App.tsx` | Import and add `<ScrollToTop />` component |
