import { describe, expect, it, vi, afterEach } from "vitest";
import { cloudClient, type CloudBffRequest, type CloudBffResponse } from "@/lib/cloudClient";
import {
  cloudEngineOverviewView,
  fetchCloudEngineOverview,
  resolveCloudEngineOverviewView,
} from "./useCloudEngineOverview";

const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const engineId = "11111111-1111-4111-8111-111111111111";

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
    vi.restoreAllMocks();
  });

  it("loads an overview without calling bootstrap", async () => {
    const invoke = vi.spyOn(cloudClient, "invoke").mockImplementation(async (body: CloudBffRequest) => {
      if (body.action === "engineOverview") {
        const response: CloudBffResponse = {
          ok: true,
          state: "ready",
          workspaceId: body.workspaceId,
          engine: {
            id: engineId,
            name: "Production",
            slug: "production",
            status: "Ready",
            release: "3.8.4",
            health: "Healthy",
            canOpen: true,
            version: 1,
            etag: '"1"',
            organizationId: null,
            audience: null,
            redirectUri: null,
            allowedActions: {
              restart: { allowed: true, reasonCode: null },
              applyRelease: { allowed: true, reasonCode: null },
              open: { allowed: true, reasonCode: null },
            },
          },
        };
        return response;
      }
      return { ok: false, code: "unknown_action", error: "unexpected" };
    });
    const result = await fetchCloudEngineOverview(workspaceId, engineId);
    expect(result).toMatchObject({ ok: true, engine: { name: "Production" } });
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith({
      action: "engineOverview",
      workspaceId,
      engineId,
    });
  });
});
