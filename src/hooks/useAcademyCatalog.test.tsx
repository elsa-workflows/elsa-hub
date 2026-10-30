import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";

const { listPersonalAcademyGrants, listPublishedCourses, mapCourseAccess, useAuth } = vi.hoisted(
  () => ({
    listPersonalAcademyGrants: vi.fn(),
    listPublishedCourses: vi.fn(),
    mapCourseAccess: vi.fn(),
    useAuth: vi.fn(),
  }),
);

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => useAuth(),
}));

vi.mock("@/lib/academy", async () => {
  const actual = await vi.importActual<typeof import("@/lib/academy")>("@/lib/academy");
  return { ...actual, listPersonalAcademyGrants, listPublishedCourses, mapCourseAccess };
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
  product_codes: ["solo_bundle"],
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useAcademyCatalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listPublishedCourses.mockResolvedValue([course]);
    mapCourseAccess.mockResolvedValue({ [course.id]: true });
    listPersonalAcademyGrants.mockResolvedValue([]);
  });

  const signedIn = () => useAuth.mockReturnValue({ user: { id: "user-1" }, loading: false });

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
    expect(result.current.soloOwnership).toBe("none");
    expect(mapCourseAccess).not.toHaveBeenCalled();
    expect(listPersonalAcademyGrants).not.toHaveBeenCalled();
  });

  it("reports an error when the access check fails", async () => {
    useAuth.mockReturnValue({ user: { id: "user-1" }, loading: false });
    mapCourseAccess.mockRejectedValue(new Error("rpc failed"));

    const { result } = renderHook(() => useAcademyCatalog(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.myCourses).toEqual([]);
  });

  it("lends a team seat's or admin's access to My courses without counting it as ownership", async () => {
    signedIn();

    const { result } = renderHook(() => useAcademyCatalog(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.myCourses).toEqual([course]);
    expect(result.current.soloOwnership).toBe("none");
    expect(listPersonalAcademyGrants).toHaveBeenCalledWith("user-1");
  });

  it("reports the Solo Bundle owned when a personal grant covers every published course", async () => {
    signedIn();
    listPersonalAcademyGrants.mockResolvedValue([{ course_id: null, product_code: "solo_bundle" }]);

    const { result } = renderHook(() => useAcademyCatalog(), { wrapper });

    await waitFor(() => expect(result.current.soloOwnership).toBe("owned"));
  });

  it("reports ownership failed, not the catalogue broken, when the grants read fails", async () => {
    signedIn();
    listPersonalAcademyGrants.mockRejectedValue(new Error("grants failed"));

    const { result } = renderHook(() => useAcademyCatalog(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(listPersonalAcademyGrants).toHaveBeenCalled());
    expect(result.current.isError).toBe(false);
    await waitFor(() => expect(result.current.soloOwnership).toBe("failed"));
  });

  it("rechecks Solo ownership after ?payment=success until the grant shows up, then stops", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    window.history.pushState({}, "", "/academy?payment=success");
    try {
      signedIn();
      listPersonalAcademyGrants
        .mockResolvedValueOnce([])
        .mockResolvedValue([{ course_id: null, product_code: "solo_bundle" }]);

      const { result } = renderHook(() => useAcademyCatalog(), { wrapper });

      await waitFor(() => expect(result.current.soloOwnership).toBe("none"));
      await vi.advanceTimersByTimeAsync(3_000);
      await waitFor(() => expect(result.current.soloOwnership).toBe("owned"));
      const calls = listPersonalAcademyGrants.mock.calls.length;

      await vi.advanceTimersByTimeAsync(9_000);
      expect(listPersonalAcademyGrants).toHaveBeenCalledTimes(calls);
    } finally {
      window.history.pushState({}, "", "/");
      vi.useRealTimers();
    }
  });
});
