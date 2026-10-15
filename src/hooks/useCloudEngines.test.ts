import { describe, expect, it } from "vitest";
import { cloudEngineListView } from "./useCloudEngines";
import {
  CLOUD_UPDATING_CODE,
  CLOUD_UPDATING_MESSAGE,
  type CloudBffResponse,
} from "@/lib/cloudClient/contract";

const engine = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Production",
  slug: "production",
  status: "Ready",
  release: "3.8.4",
};

describe("cloudEngineListView", () => {
  it("is loading while the query is pending", () => {
    expect(cloudEngineListView(undefined, true)).toEqual({ kind: "loading" });
  });

  it("is empty when the BFF returns the empty state", () => {
    const result: CloudBffResponse = {
      ok: true,
      state: "empty",
      workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      engines: [],
    };
    expect(cloudEngineListView(result, false)).toEqual({ kind: "empty" });
  });

  it("is a list when engines are present", () => {
    const result: CloudBffResponse = {
      ok: true,
      state: "ready",
      workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      engines: [engine],
    };
    expect(cloudEngineListView(result, false)).toEqual({
      kind: "list",
      engines: [engine],
    });
  });

  it("is updating when Control reports an in-progress update", () => {
    const result: CloudBffResponse = {
      ok: false,
      state: "updating",
      code: CLOUD_UPDATING_CODE,
      error: CLOUD_UPDATING_MESSAGE,
    };
    expect(cloudEngineListView(result, false)).toEqual({
      kind: "updating",
      message: CLOUD_UPDATING_MESSAGE,
    });
  });
});
