import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { toast, useAuth } = vi.hoisted(() => ({
  toast: { error: vi.fn() },
  useAuth: vi.fn(() => ({ user: { id: "user-1" } as { id: string } | null })),
}));

vi.mock("sonner", () => ({ toast }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => useAuth() }));

import { AcademyKitStep } from "./AcademyKitStep";
import { ACADEMY_ALREADY_OWNED } from "@/lib/academy";
import {
  ACADEMY_KIT_BUY_NOTE,
  ACADEMY_KIT_DOWNLOAD_LABEL,
  ACADEMY_KIT_PENDING_NOTE,
  ACADEMY_SOLO_BUY_LABEL,
  ACADEMY_SOLO_OWNED_NOTE,
} from "@/lib/academyCopy";

const labKit = {
  id: "lab-kit",
  course_id: "course-1",
  lesson_id: null,
  label: "Lab kit",
  storage_path: "kits/solo-bundle/elsa-fundamentals-workshop-kit.zip",
};

function renderStep(props: Partial<Parameters<typeof AcademyKitStep>[0]> = {}, path = "/academy/core/welcome") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AcademyKitStep hasAccess={false} kitAssets={[]} onBuyCourse={vi.fn()} {...props} />
    </MemoryRouter>,
  );
}

describe("AcademyKitStep", () => {
  beforeEach(() => {
    toast.error.mockClear();
    useAuth.mockReturnValue({ user: { id: "user-1" } });
  });

  it("shows Download the kit with access", () => {
    renderStep({ hasAccess: true, kitAssets: [labKit] });
    expect(screen.getByRole("button", { name: ACADEMY_KIT_DOWNLOAD_LABEL })).toBeInTheDocument();
    expect(screen.queryByText(ACADEMY_KIT_BUY_NOTE)).not.toBeInTheDocument();
  });

  it("hides Buy on payment=success before access is granted", () => {
    const onBuyCourse = vi.fn();
    renderStep({ onBuyCourse }, "/academy/core?payment=success");
    expect(screen.getByTestId("academy-kit-pending")).toHaveTextContent(ACADEMY_KIT_PENDING_NOTE);
    expect(screen.queryByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: ACADEMY_SOLO_BUY_LABEL })).not.toBeInTheDocument();
  });

  it("swaps Buy for the owned note when checkout resolves already_owned", async () => {
    renderStep({ onBuyCourse: vi.fn().mockResolvedValue(ACADEMY_ALREADY_OWNED) });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: ACADEMY_SOLO_BUY_LABEL }));
    });
    expect(screen.getByText(ACADEMY_SOLO_OWNED_NOTE)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).not.toBeInTheDocument();
  });

  it("shows the owned note, not checkout failed, on checkout's 409", async () => {
    renderStep({
      onBuyCourse: vi.fn().mockRejectedValue({
        context: new Response(JSON.stringify({ error: ACADEMY_ALREADY_OWNED }), { status: 409 }),
      }),
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: ACADEMY_SOLO_BUY_LABEL }));
    });
    expect(screen.getByText(ACADEMY_SOLO_OWNED_NOTE)).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("re-enables Buy after Back from Stripe restores the page", async () => {
    renderStep({ onBuyCourse: vi.fn().mockResolvedValue(undefined) });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: ACADEMY_SOLO_BUY_LABEL }));
    });
    expect(screen.getByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).toBeDisabled();
    await act(async () => {
      window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
    });
    expect(screen.getByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).toBeEnabled();
  });

  it("links Buy to the page's CTA instead of starting checkout when buyHref is set", () => {
    const onBuyCourse = vi.fn();
    renderStep({ onBuyCourse, buyHref: "#academy-course-buy" });
    const link = screen.getByRole("link", { name: ACADEMY_SOLO_BUY_LABEL });
    expect(link).toHaveAttribute("href", "#academy-course-buy");
    fireEvent.click(link);
    expect(onBuyCourse).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).not.toBeInTheDocument();
  });
});
