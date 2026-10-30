import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const { toast, useAuth } = vi.hoisted(() => ({
  toast: { error: vi.fn() },
  useAuth: vi.fn(() => ({ user: { id: "user-1" } as { id: string } | null })),
}));

vi.mock("sonner", () => ({ toast }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => useAuth() }));

import { useAcademyBuy } from "./useAcademyBuy";
import { ACADEMY_ALREADY_OWNED } from "@/lib/academy";
import { ACADEMY_CHECKOUT_FAILED_LINE } from "@/lib/academyCopy";

let currentPath = "";
function PathProbe() {
  const { pathname, search } = useLocation();
  currentPath = `${pathname}${search}`;
  return null;
}

function setup(onBuyCourse: () => Promise<unknown> | void, path = "/academy/core/welcome") {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[path]}>
      <PathProbe />
      <Routes>
        <Route path="*" element={<>{children}</>} />
      </Routes>
    </MemoryRouter>
  );
  return renderHook(() => useAcademyBuy(onBuyCourse as never), { wrapper });
}

describe("useAcademyBuy", () => {
  beforeEach(() => {
    toast.error.mockClear();
    useAuth.mockReturnValue({ user: { id: "user-1" } });
  });

  it("sends a signed-out visitor to sign in instead of starting checkout", async () => {
    useAuth.mockReturnValue({ user: null });
    const onBuy = vi.fn();
    const { result } = setup(onBuy);

    expect(result.current.signedIn).toBe(false);
    await act(() => result.current.buy());
    expect(onBuy).not.toHaveBeenCalled();
    expect(currentPath).toBe("/login?redirect=%2Facademy%2Fcore%2Fwelcome");
  });

  it("starts checkout once and stays buying after the redirect starts", async () => {
    const onBuy = vi.fn().mockResolvedValue(undefined);
    const { result } = setup(onBuy);

    await act(() => result.current.buy());
    await act(() => result.current.buy());
    expect(onBuy).toHaveBeenCalledTimes(1);
    expect(result.current.buying).toBe(true);
    expect(result.current.checkoutSaysOwned).toBe(false);
  });

  it("resets buying on a back/forward cache restore", async () => {
    const { result } = setup(vi.fn().mockResolvedValue(undefined));

    await act(() => result.current.buy());
    expect(result.current.buying).toBe(true);
    act(() => {
      window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
    });
    expect(result.current.buying).toBe(false);
  });

  it("reports owned when checkout resolves ACADEMY_ALREADY_OWNED", async () => {
    const { result } = setup(vi.fn().mockResolvedValue(ACADEMY_ALREADY_OWNED));

    await act(() => result.current.buy());
    expect(result.current.checkoutSaysOwned).toBe(true);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("reports owned, not checkout failed, on checkout's 409 already_owned", async () => {
    const { result } = setup(
      vi.fn().mockRejectedValue({
        context: new Response(JSON.stringify({ error: ACADEMY_ALREADY_OWNED }), { status: 409 }),
      }),
    );

    await act(() => result.current.buy());
    expect(result.current.checkoutSaysOwned).toBe(true);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("toasts and re-enables Buy on any other failure", async () => {
    const { result } = setup(vi.fn().mockRejectedValue(new Error("down")));

    await act(() => result.current.buy());
    expect(toast.error).toHaveBeenCalledWith(ACADEMY_CHECKOUT_FAILED_LINE);
    expect(result.current.buying).toBe(false);
    expect(result.current.checkoutSaysOwned).toBe(false);
  });

  it("flags payment=success", () => {
    const { result } = setup(vi.fn(), "/academy/core?payment=success");
    expect(result.current.paymentSuccess).toBe(true);
  });
});
