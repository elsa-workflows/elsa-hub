import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CLOUD_LIMIT_MESSAGE } from "@/lib/cloud";
import { CLOUD_ACTION_CHANGED_SINCE_READ, CLOUD_ACTION_FALLBACK, CLOUD_LIMIT_MESSAGE_SIGNED, CLOUD_REASON_DELETE_BLOCKED_IN_FLIGHT } from "./signedCopy";
import { cloudActionErrorLine } from "./actionError";
import { setCloudSignedCopyEnabledForTests } from "./signedCopyFlag";

beforeEach(() => setCloudSignedCopyEnabledForTests(true));
afterEach(() => setCloudSignedCopyEnabledForTests(undefined));

describe("cloudActionErrorLine (signed copy on)", () => {
  it("returns null for a successful or non-error result", () => {
    expect(cloudActionErrorLine({ ok: true })).toBeNull();
    expect(cloudActionErrorLine(null)).toBeNull();
  });

  it("uses the signed changed-since-read and limit lines", () => {
    expect(cloudActionErrorLine({
      ok: false,
      code: "changed_since_read",
      error: "This engine changed since you opened it.",
    })).toBe(CLOUD_ACTION_CHANGED_SINCE_READ);
    expect(cloudActionErrorLine({
      ok: false,
      code: "instance_limit_reached",
      error: "ignored",
    })).toBe(CLOUD_LIMIT_MESSAGE_SIGNED);
  });

  it("maps a passed-through Control code instead of showing the BFF error string", () => {
    expect(cloudActionErrorLine({
      ok: false,
      code: "instance.operation-active",
      error: "The request could not be completed.",
    }, "delete")).toBe(CLOUD_REASON_DELETE_BLOCKED_IN_FLIGHT);
  });

  it("uses the signed action fallback when the code is unmapped", () => {
    expect(cloudActionErrorLine({
      ok: false,
      code: "instance.shape-invalid",
    })).toBe(CLOUD_ACTION_FALLBACK);
  });
});

describe("cloudActionErrorLine (signed copy off)", () => {
  it("still maps codes and never returns raw error prose, while keeping Launch A and the #948 line flagged", () => {
    setCloudSignedCopyEnabledForTests(false);
    expect(cloudActionErrorLine({
      ok: false,
      code: "changed_since_read",
      error: "This engine changed since you opened it.",
    })).toBe(CLOUD_ACTION_CHANGED_SINCE_READ);
    expect(cloudActionErrorLine({
      ok: false,
      code: "instance_limit_reached",
      error: "ignored",
    })).toBe(CLOUD_LIMIT_MESSAGE);
    expect(cloudActionErrorLine({
      ok: false,
      code: "instance.operation-active",
      error: "The request could not be completed.",
    }, "delete")).toBe(CLOUD_REASON_DELETE_BLOCKED_IN_FLIGHT);
    expect(cloudActionErrorLine({
      ok: false,
      code: "instance.shape-invalid",
      error: "raw control prose",
    })).toBe(CLOUD_ACTION_FALLBACK);
    expect(cloudActionErrorLine({
      ok: false,
      code: "instance.delete-permission-required",
      error: "forbidden",
    }, "delete")).toBe(CLOUD_ACTION_FALLBACK);
  });
});
