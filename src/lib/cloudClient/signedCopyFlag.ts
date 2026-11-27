/**
 * Feature setting for the signed Cloud copy and deleted-engine UX (#237).
 *
 * Defaults OFF in production. The setting is on only when
 * `VITE_CLOUD_SIGNED_COPY` is explicitly `1`, `true`, or `on` (any case,
 * trimmed). Turning it on is a separate step that needs Control goldens
 * from #230 / valence-works/elsa-control#1056 in place. Rollback is to
 * unset the variable (or set anything other than 1/true/on) and redeploy.
 * Nothing new from the signed copy module may show while the setting is off.
 */
const ON_VALUES = new Set(["1", "true", "on"]);

let testOverride: boolean | undefined;

export const CLOUD_SIGNED_COPY_ENV = "VITE_CLOUD_SIGNED_COPY";

export function cloudSignedCopyEnabledFromEnv(value?: string | null): boolean {
  const parsed = value?.trim().toLowerCase();
  return Boolean(parsed && ON_VALUES.has(parsed));
}

export function isCloudSignedCopyEnabled(): boolean {
  if (testOverride !== undefined) return testOverride;
  return cloudSignedCopyEnabledFromEnv(import.meta.env.VITE_CLOUD_SIGNED_COPY as string | undefined);
}

/** Test-only. Pass `undefined` to clear the override. */
export function setCloudSignedCopyEnabledForTests(value?: boolean): void {
  testOverride = value;
}
