import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => invoke(...args),
    },
  },
}));

import { bffCloudClient } from "./bff";

function httpError(status: number, body: unknown) {
  return new FunctionsHttpError(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("bffCloudClient", () => {
  afterEach(() => {
    invoke.mockReset();
  });

  it("returns a successful 2xx body from data", async () => {
    invoke.mockResolvedValue({
      data: { ok: true, state: "ready", workspaces: [] },
      error: null,
    });
    await expect(bffCloudClient.invoke({ action: "listWorkspaces" })).resolves.toEqual({
      ok: true,
      state: "ready",
      workspaces: [],
    });
  });

  it("reads 401 unauthorized from error.context.json()", async () => {
    invoke.mockResolvedValue({
      data: null,
      error: httpError(401, { ok: false, code: "unauthorized", error: "Sign in required." }),
    });
    await expect(bffCloudClient.invoke({ action: "listWorkspaces" })).resolves.toEqual({
      ok: false,
      code: "unauthorized",
      error: "Sign in required.",
    });
  });

  it("reads 403 forbidden from error.context.json()", async () => {
    invoke.mockResolvedValue({
      data: null,
      error: httpError(403, {
        ok: false,
        code: "forbidden",
        error: "This workspace is not available.",
      }),
    });
    await expect(
      bffCloudClient.invoke({
        action: "selectWorkspace",
        workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
    ).resolves.toEqual({
      ok: false,
      code: "forbidden",
      error: "This workspace is not available.",
    });
  });

  it("reads 404 not_found from error.context.json()", async () => {
    invoke.mockResolvedValue({
      data: null,
      error: httpError(404, { ok: false, code: "not_found", error: "This engine is not available." }),
    });
    await expect(
      bffCloudClient.invoke({
        action: "engineOverview",
        workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        engineId: "missing",
      }),
    ).resolves.toEqual({
      ok: false,
      code: "not_found",
      error: "This engine is not available.",
    });
  });

  it("falls back to updating when the HTTP error body does not parse", async () => {
    invoke.mockResolvedValue({
      data: null,
      error: new FunctionsHttpError(new Response("not-json", { status: 503 })),
    });
    const result = await bffCloudClient.invoke({ action: "listWorkspaces" });
    expect(result).toMatchObject({ ok: false, state: "updating" });
  });

  it("falls back to updating for fetch and relay errors", async () => {
    invoke.mockResolvedValue({
      data: null,
      error: new FunctionsFetchError(new Error("offline")),
    });
    await expect(bffCloudClient.invoke({ action: "bootstrap" })).resolves.toMatchObject({
      ok: false,
      state: "updating",
    });

    invoke.mockResolvedValue({
      data: null,
      error: new FunctionsRelayError(new Error("relay")),
    });
    await expect(bffCloudClient.invoke({ action: "bootstrap" })).resolves.toMatchObject({
      ok: false,
      state: "updating",
    });
  });
});
