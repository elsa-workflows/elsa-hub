import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

const { toastSuccess, toastMessage } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastMessage: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: toastSuccess, message: toastMessage } }));

import { usePaymentReturnToast } from "./usePaymentReturnToast";

function Probe({ payment }: { payment: "success" | "cancelled" }) {
  usePaymentReturnToast(payment, "Title", "Description");
  return <div data-testid="search">{useLocation().search}</div>;
}

function renderAt(url: string, payment: "success" | "cancelled") {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Probe payment={payment} />
    </MemoryRouter>,
  );
}

describe("usePaymentReturnToast", () => {
  beforeEach(() => {
    toastSuccess.mockReset();
    toastMessage.mockReset();
  });

  it("toasts a successful checkout return once and drops only the payment param", async () => {
    renderAt("/cloud?payment=success&tab=engines", "success");

    await waitFor(() => expect(screen.getByTestId("search")).toHaveTextContent("?tab=engines"));
    expect(toastSuccess).toHaveBeenCalledTimes(1);
    expect(toastSuccess).toHaveBeenCalledWith("Title", { description: "Description" });
    expect(toastMessage).not.toHaveBeenCalled();
  });

  it("toasts a cancelled checkout return as a neutral message", async () => {
    renderAt("/cloud/billing?payment=cancelled", "cancelled");

    await waitFor(() => expect(screen.getByTestId("search")).toHaveTextContent(""));
    expect(toastMessage).toHaveBeenCalledWith("Title", { description: "Description" });
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("ignores a return it does not handle and leaves the URL alone", () => {
    renderAt("/cloud?payment=cancelled", "success");

    expect(screen.getByTestId("search")).toHaveTextContent("?payment=cancelled");
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(toastMessage).not.toHaveBeenCalled();
  });
});
