/**
 * Feature setting for the remaining signed Cloud copy (#237 / Lead exception).
 *
 * The deleted-engine UX (deleted page, list grouping, toasts, and the
 * code-to-copy mapping that hides raw codes and unavailableReason) and the
 * activity-log copy are always on and do not read this setting.
 *
 * Everything else from the signed copy (status/health labels, Launch A/B/E,
 * parked-change lines, and the #948 limit line) stays behind this setting. It defaults OFF in production and is on only when
 * `VITE_CLOUD_SIGNED_COPY` is explicitly `1`, `true`, or `on` (any case,
 * trimmed). Turning it on is a separate step that needs Control goldens
 * from #230 / valence-works/elsa-control#1056 in place. Rollback is to
 * unset the variable (or set anything other than 1/true/on) and redeploy.
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
