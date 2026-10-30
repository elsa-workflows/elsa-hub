import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { handleBuyCourse, toast, useAuth } = vi.hoisted(() => ({
  handleBuyCourse: vi.fn(),
  toast: { error: vi.fn(), message: vi.fn() },
  useAuth: vi.fn(() => ({ user: null })),
}));

vi.mock("sonner", () => ({ toast }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => useAuth(),
}));

vi.mock("@/lib/academy", async () => {
  const actual = await vi.importActual<typeof import("@/lib/academy")>("@/lib/academy");
  return {
    ...actual,
    handleBuyCourse,
  };
});

import { AcademySoloCta } from "./AcademySoloCta";
import { ACADEMY_ALREADY_OWNED } from "@/lib/academy";
import {
  ACADEMY_CHECKOUT_FAILED_LINE,
  ACADEMY_GUMROAD_CLAIM_LINE,
  ACADEMY_PAYMENT_PENDING_LINE,
  ACADEMY_PAYMENT_SUCCESS_LINE,
  ACADEMY_SOLO_BUY_LABEL,
  ACADEMY_SOLO_HEADING,
  ACADEMY_SOLO_INCLUDED,
  ACADEMY_SOLO_LOCKED_HEADING,
  ACADEMY_SOLO_OWNED_NOTE,
  ACADEMY_SOLO_OWNERSHIP_CHECK_FAILED_LINE,
  ACADEMY_SOLO_SIGN_IN_LABEL,
  ACADEMY_SOLO_SIGNED_OUT_NOTE,
  academySoloBundleBody,
} from "@/lib/academyCopy";

function renderCta(
  path = "/academy",
  locked = false,
  ownership?: ComponentProps<typeof AcademySoloCta>["ownership"],
) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AcademySoloCta locked={locked} ownership={ownership} onBuyCourse={handleBuyCourse} />
    </MemoryRouter>,
  );
}

describe("AcademySoloCta", () => {
  beforeEach(() => {
    handleBuyCourse.mockReset();
    toast.error.mockClear();
    useAuth.mockReturnValue({ user: null });
  });

  it("renders catalog copy, included list, and signed-out buy path", () => {
    useAuth.mockReturnValue({ user: null });
    renderCta("/academy");

    expect(screen.getByRole("heading", { name: ACADEMY_SOLO_HEADING })).toBeInTheDocument();
    expect(screen.getByText(academySoloBundleBody())).toBeInTheDocument();
    for (const item of ACADEMY_SOLO_INCLUDED) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: ACADEMY_SOLO_SIGN_IN_LABEL })).toHaveAttribute(
      "href",
      "/login?redirect=%2Facademy",
    );
    expect(screen.getByText(ACADEMY_SOLO_SIGNED_OUT_NOTE)).toBeInTheDocument();
    expect(screen.getByText(/Buying for a team\? Team packs are on the/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Training page" })).toHaveAttribute(
      "href",
      "/elsa-plus/training",
    );
    expect(screen.queryByText(ACADEMY_GUMROAD_CLAIM_LINE)).not.toBeInTheDocument();
  });

  it("starts checkout for a signed-in visitor", () => {
    useAuth.mockReturnValue({ user: { id: "user-1" } });
    renderCta("/academy");

    fireEvent.click(screen.getByRole("button", { name: ACADEMY_SOLO_BUY_LABEL }));
    expect(handleBuyCourse).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(ACADEMY_SOLO_SIGNED_OUT_NOTE)).not.toBeInTheDocument();
  });

  it("uses the locked heading and hides the included list", () => {
    useAuth.mockReturnValue({ user: { id: "user-1" } });
    renderCta("/academy/elsa-3-solo-bundle/host-elsa-in-aspnet-core", true);

    expect(screen.getByRole("heading", { name: ACADEMY_SOLO_LOCKED_HEADING })).toBeInTheDocument();
    expect(screen.queryByText(ACADEMY_SOLO_INCLUDED[0])).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).toBeInTheDocument();
    expect(screen.queryByText(ACADEMY_GUMROAD_CLAIM_LINE)).not.toBeInTheDocument();
  });

  it("shows the payment success line only when the entitlement is there", () => {
    useAuth.mockReturnValue({ user: { id: "user-1" } });
    renderCta("/academy?payment=success", false, "owned");

    expect(screen.getByTestId("academy-payment-success")).toHaveTextContent(ACADEMY_PAYMENT_SUCCESS_LINE);
    expect(screen.queryByTestId("academy-payment-pending")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).not.toBeInTheDocument();
  });

  it("does not say You're in from payment=success alone", () => {
    useAuth.mockReturnValue({ user: { id: "user-1" } });
    renderCta("/academy?payment=success");

    expect(screen.queryByTestId("academy-payment-success")).not.toBeInTheDocument();
    expect(screen.getByTestId("academy-payment-pending")).toHaveTextContent(ACADEMY_PAYMENT_PENDING_LINE);
    expect(screen.queryByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).not.toBeInTheDocument();
  });

  it("swaps Buy for the owned note when checkout reports already_owned", async () => {
    useAuth.mockReturnValue({ user: { id: "user-1" } });
    handleBuyCourse.mockResolvedValueOnce(ACADEMY_ALREADY_OWNED);
    renderCta("/academy");

    fireEvent.click(screen.getByRole("button", { name: ACADEMY_SOLO_BUY_LABEL }));
    expect(await screen.findByText(ACADEMY_SOLO_OWNED_NOTE)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).not.toBeInTheDocument();
  });

  it("keeps Buy when checkout reports nothing", async () => {
    useAuth.mockReturnValue({ user: { id: "user-1" } });
    handleBuyCourse.mockResolvedValueOnce(undefined);
    renderCta("/academy");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: ACADEMY_SOLO_BUY_LABEL }));
    });
    expect(handleBuyCourse).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).toBeInTheDocument();
    expect(screen.queryByText(ACADEMY_SOLO_OWNED_NOTE)).not.toBeInTheDocument();
  });

  const clickBuy = () =>
    act(async () => {
      fireEvent.click(screen.getByRole("button", { name: ACADEMY_SOLO_BUY_LABEL }));
    });

  it("toasts and resets Buy when checkout fails for another reason", async () => {
    useAuth.mockReturnValue({ user: { id: "user-1" } });
    handleBuyCourse.mockRejectedValueOnce(new Error("Stripe is down"));
    renderCta("/academy");

    await clickBuy();

    expect(toast.error).toHaveBeenCalledWith(ACADEMY_CHECKOUT_FAILED_LINE);
    expect(screen.getByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).toBeEnabled();
    expect(screen.queryByText(ACADEMY_SOLO_OWNED_NOTE)).not.toBeInTheDocument();
  });

  it("shows the owned note without a toast when the buy action throws checkout's 409", async () => {
    useAuth.mockReturnValue({ user: { id: "user-1" } });
    handleBuyCourse.mockRejectedValueOnce({
      context: new Response(JSON.stringify({ error: ACADEMY_ALREADY_OWNED }), { status: 409 }),
    });
    renderCta("/academy");

    await clickBuy();

    expect(await screen.findByText(ACADEMY_SOLO_OWNED_NOTE)).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("disables Buy while checkout is starting", async () => {
    useAuth.mockReturnValue({ user: { id: "user-1" } });
    let finish: () => void = () => {};
    handleBuyCourse.mockReturnValueOnce(new Promise<void>((resolve) => (finish = resolve)));
    renderCta("/academy");

    await clickBuy();
    expect(screen.getByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).toBeDisabled();

    await act(async () => finish());
    expect(screen.getByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).toBeEnabled();
  });

  it("hides Buy and says so when ownership could not be checked", () => {
    useAuth.mockReturnValue({ user: { id: "user-1" } });
    renderCta("/academy", false, "failed");

    expect(screen.getByText(ACADEMY_SOLO_OWNERSHIP_CHECK_FAILED_LINE)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).not.toBeInTheDocument();
    expect(screen.queryByText(ACADEMY_SOLO_OWNED_NOTE)).not.toBeInTheDocument();
  });

  it("shows nothing in the purchase area while ownership is unknown", () => {
    useAuth.mockReturnValue({ user: { id: "user-1" } });
    renderCta("/academy", false, "unknown");

    expect(screen.queryByText(ACADEMY_SOLO_OWNERSHIP_CHECK_FAILED_LINE)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).not.toBeInTheDocument();
  });

  it("does not mention purchases to a signed-out visitor when ownership could not be checked", () => {
    renderCta("/academy", false, "failed");

    expect(screen.queryByText(ACADEMY_SOLO_OWNERSHIP_CHECK_FAILED_LINE)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: ACADEMY_SOLO_SIGN_IN_LABEL })).not.toBeInTheDocument();
  });
});
