import { describe, expect, it } from "vitest";
import { CLOUD_LIMIT_MESSAGE } from "@/lib/cloud";
import { CLOUD_DELETE_CHANGED_SINCE_READ } from "./copy";
import { cloudActionErrorLine } from "./actionError";

describe("cloudActionErrorLine", () => {
  it("returns null for a successful or non-error result", () => {
    expect(cloudActionErrorLine({ ok: true })).toBeNull();
    expect(cloudActionErrorLine(null)).toBeNull();
  });

  it("reuses the existing changed-since-read line", () => {
    expect(cloudActionErrorLine({
      ok: false,
      code: "changed_since_read",
      error: "This engine changed since you opened it.",
    })).toBe(CLOUD_DELETE_CHANGED_SINCE_READ);
  });

  it("reuses the signed engine-limit line", () => {
    expect(cloudActionErrorLine({
      ok: false,
      code: "instance_limit_reached",
      error: "ignored",
    })).toBe(CLOUD_LIMIT_MESSAGE);
  });

  it("shows the BFF fallback for a passed-through Control code, not a made-up line", () => {
    expect(cloudActionErrorLine({
      ok: false,
      code: "instance.operation-active",
      error: "The request could not be completed.",
    })).toBe("The request could not be completed.");
  });

  it("falls back to the existing generic line when there is no error string", () => {
    expect(cloudActionErrorLine({
      ok: false,
      code: "instance.shape-invalid",
    })).toBe("That action could not be completed.");
  });

  it("shows the existing generic line for contract_mismatch, not the unreachable copy", () => {
    expect(cloudActionErrorLine({
      ok: false,
      code: "contract_mismatch",
      error: "The request could not be completed.",
    })).toBe("The request could not be completed.");
    expect(cloudActionErrorLine({
      ok: false,
      code: "contract_mismatch",
    })).toBe("That action could not be completed.");
  });
});
