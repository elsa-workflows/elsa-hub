import { afterEach, describe, expect, it } from "vitest";
import {
  clearCloudSetupMarker,
  forgetCloudSetupIfUserGone,
  hasCloudSetupMarker,
  setCloudSetupMarker,
} from "./setupMarker";

const userId = "user-1";

describe("cloud setup marker", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("is unset until bootstrap records it for that Hub user", () => {
    expect(hasCloudSetupMarker(userId)).toBe(false);
    setCloudSetupMarker(userId);
    expect(hasCloudSetupMarker(userId)).toBe(true);
    expect(hasCloudSetupMarker("someone-else")).toBe(false);
  });

  it("clears on 401 unauthorized for that user", () => {
    setCloudSetupMarker(userId);
    expect(
      forgetCloudSetupIfUserGone(
        userId,
        { ok: false, code: "unauthorized", error: "Sign in required." },
        "listWorkspaces",
      ),
    ).toBe(true);
    expect(hasCloudSetupMarker(userId)).toBe(false);
  });

  it("clears on 404 for account-level calls, not engine 404", () => {
    setCloudSetupMarker(userId);
    expect(
      forgetCloudSetupIfUserGone(
        userId,
        { ok: false, code: "not_found", error: "This engine is not available." },
        "engineOverview",
      ),
    ).toBe(false);
    expect(hasCloudSetupMarker(userId)).toBe(true);

    expect(
      forgetCloudSetupIfUserGone(
        userId,
        { ok: false, code: "not_found", error: "Workspace not found." },
        "listWorkspaces",
      ),
    ).toBe(true);
    expect(hasCloudSetupMarker(userId)).toBe(false);
  });
});
