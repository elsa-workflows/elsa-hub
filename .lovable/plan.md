## Goal
Reorganize the footer navigation in `src/components/layout/Footer.tsx` to eliminate duplication and group items by their natural category.

## Changes

### 1. Data (`footerLinks` object)
- **Product**: Remove `Resources`, `Blog`, and `Radar`. Keep: Home, Features, Get Started, Elsa+, Runtime Builder, Roadmap.
- **Resources**: Add `Blog` (internal `to: "/blog"`). Keep: Documentation, GitHub, Discord, NuGet Packages.
- **Community**: Add `Radar` (internal `to: "/community/radar"`). Keep: Contributing, Discussions, Issues.

### 2. Rendering logic
- Update the **Resources** section to render both internal `Link` (for Blog) and external `<a>` (for everything else), matching the existing Product/Community styling.
- Update the **Community** section to render both internal `Link` (for Radar) and external `<a>` (for everything else).

No other files touched. No visual style changes.