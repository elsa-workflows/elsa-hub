import { describe, expect, it, vi, afterEach } from "vitest";
import { cloudClient } from "@/lib/cloudClient";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useCloudEngineLifecycle } from "./useCloudEngineLifecycle";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const engineId = "11111111-1111-4111-8111-111111111111";

describe("useCloudEngineLifecycle", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("pauses writes when compatibility is updating without stopping reads", async () => {
    const invoke = vi.spyOn(cloudClient, "invoke").mockImplementation(async (body) => {
      if (body.action === "availableReleases") {
        return {
          ok: true,
          state: "ready",
          workspaceId,
          engineId,
          releases: [{ releaseLine: "3.8", version: "3.8.5", channel: "stable", changeKind: "patch" }],
        };
      }
      return { ok: false, code: "unknown_action", error: "unexpected" };
    });
    const { result } = renderHook(
      () => useCloudEngineLifecycle(workspaceId, engineId, "Ready", false, true),
      { wrapper },
    );
    await waitFor(() => expect(result.current.releases).toHaveLength(1));
    const restart = await result.current.restart({
      idempotencyKey: "44444444-4444-4444-4444-444444444444",
      ifMatch: '"1"',
    });
    expect(restart).toMatchObject({ state: "updating" });
    expect(invoke.mock.calls.map(([body]) => body.action)).not.toContain("restartEngine");
  });

  it("does not retry mutations while Control is updating", async () => {
    const invoke = vi.spyOn(cloudClient, "invoke");
    const { result } = renderHook(
      () => useCloudEngineLifecycle(workspaceId, engineId, "Ready", true),
      { wrapper },
    );
    const restart = await result.current.restart({
      idempotencyKey: "44444444-4444-4444-4444-444444444444",
      ifMatch: '"1"',
    });
    expect(restart).toMatchObject({ state: "updating" });
    expect(invoke).not.toHaveBeenCalled();
  });

  it("polls delete operations until a terminal state", async () => {
    const invoke = vi.spyOn(cloudClient, "invoke").mockResolvedValue({
      ok: true,
      state: "ready",
      workspaceId,
      engineId,
      operation: { id: "55555555-5555-5555-5555-555555555555", action: "Delete", state: "Succeeded" },
    });
    const { result } = renderHook(
      () => useCloudEngineLifecycle(workspaceId, engineId, "Deleting", false),
      { wrapper },
    );
    const terminal = await result.current.pollDeleteOperation("55555555-5555-5555-5555-555555555555");
    expect(terminal).toMatchObject({ operation: { state: "Succeeded" } });
    expect(invoke).toHaveBeenCalledWith({
      action: "deleteOperationStatus",
      workspaceId,
      engineId,
      operationId: "55555555-5555-5555-5555-555555555555",
    });
    await waitFor(() => expect(invoke).toHaveBeenCalled());
  });
});
