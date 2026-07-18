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
export const ELSA_VERSION = "3.7.1";

/** .NET SDKs the pinned Elsa release is tested against. */
export const SUPPORTED_DOTNET_SDKS = ["8.0", "9.0"] as const;

/** ISO date of the last clean-room verification of the guides. */
export const LAST_VERIFIED_ON = "2026-07-18";

/** Convenience helper for `dotnet add package` snippets. */
export const pkg = (name: string) =>
  `dotnet add package ${name} --version ${ELSA_VERSION}`;
