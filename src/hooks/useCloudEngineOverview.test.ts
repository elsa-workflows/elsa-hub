import { describe, expect, it, vi, afterEach } from "vitest";
import { cloudClient } from "@/lib/cloudClient";
import { setCloudStubScenario, STUB_WORKSPACE } from "@/lib/cloudClient/stub";
import {
  cloudEngineOverviewView,
  fetchCloudEngineOverview,
  resolveCloudEngineOverviewView,
} from "./useCloudEngineOverview";

describe("cloudEngineOverviewView", () => {
  it("is missing for not_found so the overview branch is reachable", () => {
    expect(
      cloudEngineOverviewView(
        { ok: false, code: "not_found", error: "This engine is not available." },
        false,
      ),
    ).toEqual({ kind: "missing" });
  });

  it("is an error for forbidden", () => {
    expect(
      cloudEngineOverviewView(
        { ok: false, code: "forbidden", error: "This workspace is not available." },
        false,
      ),
    ).toEqual({ kind: "error", message: "This workspace is not available." });
  });
});

describe("resolveCloudEngineOverviewView", () => {
  it("keeps a read-only needsSetup view without an org", () => {
    expect(resolveCloudEngineOverviewView({ kind: "needsSetup" }, undefined, false)).toEqual({
      kind: "needsSetup",
    });
  });
});

describe("fetchCloudEngineOverview", () => {
  afterEach(() => {
    setCloudStubScenario("list");
    vi.restoreAllMocks();
  });

  it("loads an overview without calling bootstrap", async () => {
    const invoke = vi.spyOn(cloudClient, "invoke");
    const result = await fetchCloudEngineOverview(
      STUB_WORKSPACE.id,
      "11111111-1111-4111-8111-111111111111",
    );
    expect(result).toMatchObject({ ok: true, engine: { name: "Production" } });
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith({
      action: "engineOverview",
      workspaceId: STUB_WORKSPACE.id,
      engineId: "11111111-1111-4111-8111-111111111111",
    });
  });
});
