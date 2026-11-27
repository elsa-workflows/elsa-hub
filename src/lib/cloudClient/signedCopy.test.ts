import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CLOUD_ACTION_PERMISSION,
  CLOUD_ACTION_PERMISSION_DELETE,
  CLOUD_DELETED_BANNER_BODY_NO_DATE,
  CLOUD_DELETED_BANNER_HEADING,
  CLOUD_DELETED_BANNER_SECOND_LINE,
  CLOUD_ENGINE_DELETED_TOAST_UNNAMED,
  CLOUD_LIMIT_MESSAGE_SIGNED,
  CLOUD_REASON_GENERIC_FALLBACK,
  CLOUD_REASON_IDENTITY_UNAVAILABLE,
  CLOUD_STATUS_NOT_FULLY_HEALTHY,
  CLOUD_STATUS_SETUP_STOPPED,
  cloudDeletedBannerBody,
  cloudEngineDeletedToast,
  cloudEngineDeletingToast,
  previousDeletionsHeading,
} from "./signedCopy";
import { cloudSignedCopyEnabledFromEnv, isCloudSignedCopyEnabled, setCloudSignedCopyEnabledForTests } from "./signedCopyFlag";

const here = dirname(fileURLToPath(import.meta.url));

afterEach(() => setCloudSignedCopyEnabledForTests(undefined));

describe("signed Cloud copy (#237)", () => {
  it("defaults off unless VITE_CLOUD_SIGNED_COPY is 1, true, or on", () => {
    expect(cloudSignedCopyEnabledFromEnv(undefined)).toBe(false);
    expect(cloudSignedCopyEnabledFromEnv("")).toBe(false);
    expect(cloudSignedCopyEnabledFromEnv("0")).toBe(false);
    expect(cloudSignedCopyEnabledFromEnv("false")).toBe(false);
    expect(cloudSignedCopyEnabledFromEnv("off")).toBe(false);
    expect(cloudSignedCopyEnabledFromEnv("yes")).toBe(false);
    expect(cloudSignedCopyEnabledFromEnv("1")).toBe(true);
    expect(cloudSignedCopyEnabledFromEnv("TRUE")).toBe(true);
    expect(cloudSignedCopyEnabledFromEnv(" On ")).toBe(true);
    setCloudSignedCopyEnabledForTests(undefined);
    expect(isCloudSignedCopyEnabled()).toBe(cloudSignedCopyEnabledFromEnv(
      (import.meta.env.VITE_CLOUD_SIGNED_COPY as string | undefined) ?? "",
    ));
  });

  it("uses straight quotes in the completion and in-progress toasts", () => {
    expect(cloudEngineDeletedToast("Test")).toBe('Engine "Test" deleted.');
    expect(cloudEngineDeletedToast("")).toBe(CLOUD_ENGINE_DELETED_TOAST_UNNAMED);
    expect(cloudEngineDeletedToast(null)).toBe(CLOUD_ENGINE_DELETED_TOAST_UNNAMED);
    expect(cloudEngineDeletingToast("Test")).toBe('Deleting "Test".');
    expect(cloudEngineDeletedToast("Test")).toContain("\u0022");
    expect(cloudEngineDeletingToast("Test")).toContain("\u0022");
  });

  it("keeps the deleted banner and list heading exact", () => {
    expect(CLOUD_DELETED_BANNER_HEADING).toBe("This engine was deleted");
    expect(cloudDeletedBannerBody("Test", "27 Nov 2026, 15:05")).toBe('"Test" was deleted on 27 Nov 2026, 15:05.');
    expect(CLOUD_DELETED_BANNER_BODY_NO_DATE).toBe("This engine was deleted.");
    expect(CLOUD_DELETED_BANNER_SECOND_LINE).toBe(
      "Studio, logs and changes aren't available for a deleted engine.",
    );
    expect(previousDeletionsHeading(3)).toBe("Previous deletions (3)");
  });

  it("keeps Launch's permission, identity, Degraded and limit lines exact", () => {
    expect(CLOUD_ACTION_PERMISSION).toBe(
      "Your account doesn't have permission for this change. For help, email hello@valence.works.",
    );
    expect(CLOUD_ACTION_PERMISSION_DELETE).toBe(
      "Your account doesn't have permission to delete engines. For help, email hello@valence.works.",
    );
    expect(CLOUD_REASON_IDENTITY_UNAVAILABLE).toBe(
      "Studio sign-in isn't available for this engine. For help, email hello@valence.works.",
    );
    expect(CLOUD_STATUS_NOT_FULLY_HEALTHY).toBe("Not fully healthy");
    expect(CLOUD_STATUS_SETUP_STOPPED).toBe("Setup stopped");
    expect(CLOUD_REASON_GENERIC_FALLBACK).toBe(
      "This engine isn't available. For help, email hello@valence.works.",
    );
    expect(CLOUD_LIMIT_MESSAGE_SIGNED).toBe(
      "You've reached the number of engines your plan includes. Remove an engine, or email hello@valence.works.",
    );
  });

  it("does not ship Not running, business-hours, or typographic punctuation", () => {
    const source = readFileSync(join(here, "signedCopy.ts"), "utf8");
    expect(source).not.toContain("Not running");
    expect(source).not.toContain("This engine isn't running.");
    expect(source).not.toMatch(/business hours/i);
    expect(source).not.toContain("\u2018");
    expect(source).not.toContain("\u2019");
    expect(source).not.toContain("\u2026");
    expect(source).not.toContain("\u201c");
    expect(source).not.toContain("\u201d");
  });

  it("has no banned time-hint phrases in the signed module", () => {
    const source = readFileSync(join(here, "signedCopy.ts"), "utf8")
      .split("\n")
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join("\n");
    for (const banned of ["Please try again", "If it keeps failing", "a few minutes", "soon", "temporarily", "right now"]) {
      expect(source).not.toContain(banned);
    }
  });
});
