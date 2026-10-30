import type { ControlFetch } from "./cloud-control.ts";
import { isCompatibleControl } from "./cloud-control.ts";
import {
  CLOUD_WRITE_ACTIONS,
  type CloudBffAction,
} from "./cloud-types.ts";

export const COMPATIBILITY_CACHE_TTL_MS = 60_000;

export type CompatibilityCache = {
  get(): boolean | undefined;
  set(compatible: boolean): void;
  clear(): void;
};

export function createCompatibilityCache(options?: {
  ttlMs?: number;
  now?: () => number;
}): CompatibilityCache {
  const ttlMs = options?.ttlMs ?? COMPATIBILITY_CACHE_TTL_MS;
  const now = options?.now ?? Date.now;
  let cached: { compatible: boolean; expiresAt: number } | undefined;

  return {
    get() {
      if (!cached) return undefined;
      if (now() >= cached.expiresAt) {
        cached = undefined;
        return undefined;
      }
      return cached.compatible;
    },
    set(compatible) {
      cached = { compatible, expiresAt: now() + ttlMs };
    },
    clear() {
      cached = undefined;
    },
  };
}

const defaultCompatibilityCache = createCompatibilityCache();

export function resetCloudCompatibilityCache() {
  defaultCompatibilityCache.clear();
}

export function defaultCloudCompatibilityCache(): CompatibilityCache {
  return defaultCompatibilityCache;
}

export function isCloudWriteAction(action: CloudBffAction): boolean {
  return (CLOUD_WRITE_ACTIONS as readonly string[]).includes(action);
}

export async function writeActionsAllowed(
  controlFetch: ControlFetch,
  accessToken: string,
  cache: CompatibilityCache = defaultCompatibilityCache,
): Promise<boolean> {
  const cached = cache.get();
  if (cached !== undefined) return cached;

  const result = await controlFetch({
    method: "GET",
    path: "/api/cloud/compatibility",
    action: "compatibility",
  }, accessToken);
  const compatible = result.ok && isCompatibleControl(result.body);
  cache.set(compatible);
  return compatible;
}
