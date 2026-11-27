/**
 * Feature setting for the signed Cloud copy and deleted-engine UX (#237).
 *
 * Launch signed the copy at 16:01 CET, 27 Nov 2026 (Europe/Amsterdam), so this
 * defaults ON in production. Turning it off is the rollback: set
 * `VITE_CLOUD_SIGNED_COPY=0` and redeploy. Nothing new from the signed copy
 * module may show while the setting is off.
 */
const OFF_VALUES = new Set(["0", "false", "off"]);

let testOverride: boolean | undefined;

export const CLOUD_SIGNED_COPY_ENV = "VITE_CLOUD_SIGNED_COPY";

export function isCloudSignedCopyEnabled(): boolean {
  if (testOverride !== undefined) return testOverride;
  const value = (import.meta.env.VITE_CLOUD_SIGNED_COPY as string | undefined)?.trim().toLowerCase();
  if (value && OFF_VALUES.has(value)) return false;
  return true;
}

/** Test-only. Pass `undefined` to clear the override. */
export function setCloudSignedCopyEnabledForTests(value?: boolean): void {
  testOverride = value;
}
