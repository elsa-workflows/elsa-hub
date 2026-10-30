import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cloudClient,
  CLOUD_UPDATING_CODE,
  CLOUD_UPDATING_MESSAGE,
  type CloudBffResponse,
} from "@/lib/cloudClient";
import { cloudCompatibilityView, useCloudCompatibility } from "./useCloudCompatibility";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const updating: CloudBffResponse = {
  ok: false,
  state: "updating",
  code: CLOUD_UPDATING_CODE,
  error: CLOUD_UPDATING_MESSAGE,
};

const compatible: CloudBffResponse = {
  ok: true,
  state: "compatible",
  contractVersion: 1,
  capabilities: [],
};

describe("cloudCompatibilityView", () => {
  it("is loading while the query is pending", () => {
    expect(cloudCompatibilityView(undefined, true)).toEqual({ kind: "loading" });
  });

  it("is compatible for a successful contract", () => {
    expect(cloudCompatibilityView(compatible, false)).toEqual({ kind: "compatible" });
  });

  it("is updating when Control reports an insufficient contract", () => {
    expect(cloudCompatibilityView(updating, false)).toEqual({
      kind: "updating",
      message: CLOUD_UPDATING_MESSAGE,
    });
  });
});

describe("useCloudCompatibility", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls compatibility on load and does not retry on its own", async () => {
    const invoke = vi.spyOn(cloudClient, "invoke").mockResolvedValue(updating);
    const { result } = renderHook(() => useCloudCompatibility(), { wrapper });

    await waitFor(() => expect(result.current.updating).toBe(true));
    expect(result.current.message).toBe(CLOUD_UPDATING_MESSAGE);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith({ action: "compatibility" });
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("recovers on the next successful compatibility read", async () => {
    const invoke = vi.spyOn(cloudClient, "invoke")
      .mockResolvedValueOnce(updating)
      .mockResolvedValueOnce(compatible);
    const { result } = renderHook(() => useCloudCompatibility(), { wrapper });

    await waitFor(() => expect(result.current.updating).toBe(true));
    expect(result.current.compatible).toBe(false);

    await result.current.refetch();

    await waitFor(() => expect(result.current.compatible).toBe(true));
    expect(result.current.updating).toBe(false);
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(invoke.mock.calls.every(([body]) => body.action === "compatibility")).toBe(true);
  });
});
