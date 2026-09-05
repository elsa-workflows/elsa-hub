/**
 * Central version anchor for all Get Started guides.
 *
 * Every Elsa and Elsa Studio package referenced in the guides must be
 * pinned to this exact version so the walkthroughs stay coherent from a
 * clean checkout. When a new Elsa release is published:
 *
 *   1. Bump ELSA_VERSION below.
 *   2. Re-run each guide from an empty directory:
 *        dotnet restore && dotnet build && dotnet run
 *   3. Update SUPPORTED_DOTNET_SDKS if the release changes SDK support.
 *   4. Update LAST_VERIFIED_ON.
 *
 * Elsa and Elsa Studio ship on the same release line, so a single
 * version applies to both.
 */
export const ELSA_VERSION = "3.8.0";

/** Publication date of the pinned Elsa release. */
export const ELSA_RELEASE_DATE = "2026-09-05";

/** Official release notes for the pinned release line. */
export const ELSA_RELEASE_LINKS = {
  core: `https://github.com/elsa-workflows/elsa-core/releases/tag/${ELSA_VERSION}`,
  studio: `https://github.com/elsa-workflows/elsa-studio/releases/tag/${ELSA_VERSION}`,
  extensions: `https://github.com/elsa-workflows/elsa-extensions/releases/tag/${ELSA_VERSION}`,
} as const;

/**
 * The `Elsa.Templates` package ships on its own cadence and is NOT part of the
 * Elsa Core / Studio release line. As of 2026-09-05 the latest version
 * published to NuGet.org is 3.7.1 — there is no 3.8.0 template package yet.
 * Do not raise this to ELSA_VERSION until a matching package is published.
 * Verify with: https://www.nuget.org/packages/Elsa.Templates
 */
export const ELSA_TEMPLATES_VERSION = "3.7.1";

/** .NET SDKs the pinned Elsa release is tested against. */
export const SUPPORTED_DOTNET_SDKS = ["8.0", "9.0", "10.0"] as const;

/**
 * ISO date of the last clean-room verification of the guides
 * (performed against Elsa 3.7.1).
 */
export const LAST_VERIFIED_ON = "2026-07-18";

/**
 * ISO date on which the package versions and registration APIs on these pages
 * were checked against the tagged 3.8.0 sources and NuGet.org.
 */
export const PACKAGES_CHECKED_ON = "2026-09-05";

/** Convenience helper for `dotnet add package` snippets. */
export const pkg = (name: string) =>
  `dotnet add package ${name} --version ${ELSA_VERSION}`;
