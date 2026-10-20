import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";

const { listPublishedCourses, mapCourseAccess, useAuth } = vi.hoisted(() => ({
  listPublishedCourses: vi.fn(),
  mapCourseAccess: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => useAuth(),
}));

vi.mock("@/lib/academy", async () => {
  const actual = await vi.importActual<typeof import("@/lib/academy")>("@/lib/academy");
  return { ...actual, listPublishedCourses, mapCourseAccess };
});

import { useAcademyCatalog } from "./useAcademyCatalog";

const course = {
  id: "course-1",
  slug: "solo",
  title: "Solo Bundle",
  summary: null,
  sort_order: 1,
  is_published: true,
  price_cents: 2900,
  currency: "eur",
  stripe_price_id: null,
  product_code: "solo_bundle",
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useAcademyCatalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listPublishedCourses.mockResolvedValue([course]);
  });

  it("stays loading while auth is still resolving, even after the courses load", async () => {
    useAuth.mockReturnValue({ user: null, loading: true });

    const { result } = renderHook(() => useAcademyCatalog(), { wrapper });

    await waitFor(() => expect(result.current.courses).toHaveLength(1));
    expect(result.current.isLoading).toBe(true);
    expect(mapCourseAccess).not.toHaveBeenCalled();
  });

  it("finishes loading for an anonymous visitor without checking access", async () => {
    useAuth.mockReturnValue({ user: null, loading: false });

    const { result } = renderHook(() => useAcademyCatalog(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.myCourses).toEqual([]);
    expect(mapCourseAccess).not.toHaveBeenCalled();
  });

  it("reports an error when the access check fails", async () => {
    useAuth.mockReturnValue({ user: { id: "user-1" }, loading: false });
    mapCourseAccess.mockRejectedValue(new Error("rpc failed"));

    const { result } = renderHook(() => useAcademyCatalog(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.myCourses).toEqual([]);
  });
});
