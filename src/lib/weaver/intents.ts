// Tool-call "intent" payloads emitted by the weaver edge function.
// The client validates and applies these after the user clicks Confirm.

import { resolvePath } from "react-router-dom";

export type WeaverIntent =
  | NavigateIntent
  | RbAddPackageIntent
  | RbRemovePackageIntent
  | RbToggleFeatureIntent
  | RbSetFeatureSettingIntent
  | RbSelectInfrastructureIntent
  | RbSelectImageIntent
  | RbAutoFillInfrastructureIntent
  | RbValidateIntent
  | RbGenerateBundleIntent;

export interface NavigateIntent {
  kind: "navigate";
  path: string;
  label: string;
  reason: string;
}

export interface RbAddPackageIntent {
  kind: "rb.addPackage";
  packageId: string;
  reason?: string;
}
export interface RbRemovePackageIntent {
  kind: "rb.removePackage";
  packageId: string;
}
export interface RbToggleFeatureIntent {
  kind: "rb.toggleFeature";
  packageId: string;
  featureId: string;
  enabled: boolean;
}
export interface RbSetFeatureSettingIntent {
  kind: "rb.setFeatureSetting";
  packageId: string;
  featureId: string;
  name: string;
  value: unknown;
}
export interface RbSelectInfrastructureIntent {
  kind: "rb.selectInfrastructure";
  kindOf: string;
  providerId: string;
}
export interface RbSelectImageIntent {
  kind: "rb.selectImage";
  slug: string;
  tag?: string;
  hostPort?: number;
  reason?: string;
}
export interface RbAutoFillInfrastructureIntent {
  kind: "rb.autoFillInfrastructure";
}
export interface RbValidateIntent {
  kind: "rb.validate";
}
export interface RbGenerateBundleIntent {
  kind: "rb.generateBundle";
}

const WEAVER_NAVIGATION_ORIGIN = "https://weaver.invalid";
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/;

export function getSafeWeaverNavigationPath(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    CONTROL_CHARACTERS.test(value)
  ) {
    return null;
  }

  try {
    const parsed = new URL(value, WEAVER_NAVIGATION_ORIGIN);
    if (parsed.origin !== WEAVER_NAVIGATION_ORIGIN) return null;

    // URL parsing resolves dot segments; React Router's path resolver applies
    // the same normalization again before handing a path to browser history.
    const resolved = resolvePath(`${parsed.pathname}${parsed.search}${parsed.hash}`, "/");
    if (!resolved.pathname.startsWith("/") || resolved.pathname.startsWith("//")) return null;

    const path = `${resolved.pathname}${resolved.search}${resolved.hash}`;
    const finalUrl = new URL(path, WEAVER_NAVIGATION_ORIGIN);
    if (finalUrl.origin !== WEAVER_NAVIGATION_ORIGIN || finalUrl.pathname.startsWith("//")) {
      return null;
    }

    return path;
  } catch {
    return null;
  }
}

export function isWeaverIntent(value: unknown): value is WeaverIntent {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as { kind?: unknown }).kind === "string",
  );
}
