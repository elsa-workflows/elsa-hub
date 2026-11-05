import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { RadarLocationRow } from "@/lib/radarLocations";

const { from, resolveQuery } = vi.hoisted(() => {
  let result: { data: RadarLocationRow[] | null; error: { message: string } | null } = {
    data: [],
    error: null,
  };
  const chain = {
    select: () => chain,
    eq: (...args: unknown[]) => {
      chain.eqCalls.push(args);
      return chain;
    },
    order: () => chain,
    limit: () => Promise.resolve(result),
    eqCalls: [] as unknown[][],
  };
  return {
    from: vi.fn(() => chain),
    resolveQuery: (next: typeof result) => {
      result = next;
    },
    chain,
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from },
}));

import { useRadarLocations } from "./useRadarLocations";

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function row(overrides: Partial<RadarLocationRow> = {}): RadarLocationRow {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    latitude: 59.9139,
    longitude: 10.7522,
    city: "Oslo",
    country: "Norway",
    region: "Europe",
    anonymous: false,
    weight: 1,
    company_name: "Real Team",
    company_logo_url: null,
    website_url: null,
    industry: "SaaS",
    description: "A real opt-in showcase.",
    using_since: 2024,
    sort_order: 1,
    status: "approved",
    submitted_contact_email: "team@example.com",
    submitted_by: null,
    submitted_at: "2026-10-01T00:00:00Z",
    reviewed_at: "2026-10-02T00:00:00Z",
    reviewed_by: null,
    rejection_reason: null,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-02T00:00:00Z",
    ...overrides,
  };
}

describe("useRadarLocations", () => {
  beforeEach(() => {
    from.mockClear();
    resolveQuery({ data: [], error: null });
  });

  it("asks Supabase only for approved radar_locations rows", async () => {
    const { result } = renderHook(() => useRadarLocations(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(from).toHaveBeenCalledWith("radar_locations");
    const chain = from.mock.results[0]?.value as { eqCalls: unknown[][] };
    expect(chain.eqCalls).toContainEqual(["status", "approved"]);
  });

  it("does not fall back to the sample dataset when the query fails or is empty", async () => {
    resolveQuery({ data: null, error: { message: "permission denied" } });
    const failed = renderHook(() => useRadarLocations(), { wrapper: createWrapper() });
    await waitFor(() => expect(failed.result.current.isSuccess).toBe(true));
    expect(failed.result.current.data).toEqual([]);

    resolveQuery({ data: [], error: null });
    const empty = renderHook(() => useRadarLocations(), { wrapper: createWrapper() });
    await waitFor(() => expect(empty.result.current.isSuccess).toBe(true));
    expect(empty.result.current.data).toEqual([]);
    expect(empty.result.current.data?.some((location) => location.id.startsWith("anon-"))).toBeFalsy();
    expect(empty.result.current.data?.some((location) => location.companyName === "North Claims")).toBeFalsy();
  });

  it("drops sample placeholders and the Ahornweg street address from approved rows", async () => {
    resolveQuery({
      error: null,
      data: [
        row(),
        row({
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          city: "Ahornweg 4, Switzerland",
          country: "Switzerland",
          anonymous: true,
          company_name: null,
        }),
        row({
          id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          city: "Berlin",
          country: "Germany",
          anonymous: true,
          company_name: null,
          submitted_at: null,
          submitted_by: null,
          submitted_contact_email: null,
        }),
        row({
          id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          city: "London",
          country: "United Kingdom",
          anonymous: false,
          company_name: "North Claims",
          submitted_at: null,
          submitted_by: null,
          submitted_contact_email: null,
        }),
      ],
    });

    const { result } = renderHook(() => useRadarLocations(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toHaveLength(1));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]?.companyName).toBe("Real Team");
    expect(result.current.data?.some((location) => location.city?.includes("Ahornweg"))).toBe(false);
    expect(result.current.data?.some((location) => location.companyName === "North Claims")).toBe(false);
  });
});
