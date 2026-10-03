import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TrainingInterestDialog } from "./TrainingInterestDialog";

const insertMock = vi.fn(async () => ({ error: null }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      insert: (payload: unknown) => insertMock(payload),
    }),
    functions: {
      invoke: async () => ({ data: { success: true }, error: null }),
    },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/hooks/useUserProfile", () => ({
  useUserProfile: () => ({ profile: null }),
}));

vi.mock("@/hooks/useOrganizations", () => ({
  useOrganizations: () => ({ organizations: [] }),
}));

describe("TrainingInterestDialog", () => {
  it("shows notify fields including interest and start month", () => {
    render(
      <TrainingInterestDialog open intent="notify" onOpenChange={() => {}} />,
    );

    expect(screen.getByRole("heading", { name: /get fundamentals core/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
    expect(screen.getByText("Interest")).toBeInTheDocument();
    expect(screen.getByText("Self-paced Core")).toBeInTheDocument();
    expect(screen.getByText("Preferred start month")).toBeInTheDocument();
    expect(screen.queryByLabelText(/headcount/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Offerings")).not.toBeInTheDocument();
  });

  it("adds quote-only headcount, delivery, and notes", () => {
    render(
      <TrainingInterestDialog open intent="quote" onOpenChange={() => {}} />,
    );

    expect(screen.getByRole("heading", { name: /private team workshop/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/headcount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/delivery/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    expect(screen.queryByText("Offerings")).not.toBeInTheDocument();
  });

  it("shows provider listing fields instead of buyer-only fields", () => {
    render(
      <TrainingInterestDialog open intent="provider" onOpenChange={() => {}} />,
    );

    expect(screen.getByRole("heading", { name: /offer elsa workflows training/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/organisation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contact name/i)).toBeInTheDocument();
    expect(screen.getByText("Regions")).toBeInTheDocument();
    expect(screen.getByText("Languages")).toBeInTheDocument();
    expect(screen.getByText("Offerings")).toBeInTheDocument();
    expect(screen.getByLabelText(/experience/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/headcount/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Company size")).not.toBeInTheDocument();
  });

  it("preselects self-paced Core when defaultInterest is set", () => {
    render(
      <TrainingInterestDialog
        open
        intent="notify"
        defaultInterest="self_paced"
        onOpenChange={() => {}}
      />,
    );

    expect(screen.getByRole("radio", { name: /self-paced core/i })).toBeChecked();
  });

  it("shows the seat-quote variant title and prefills the notes marker", () => {
    render(
      <TrainingInterestDialog
        open
        intent="quote"
        quoteVariant="seat_quote"
        defaultInterest="self_paced"
        onOpenChange={() => {}}
      />,
    );

    expect(screen.getByRole("heading", { name: /request a 25\+ seat quote/i })).toBeInTheDocument();
    expect(screen.getByText(/team pack quote for 25 or more people/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toHaveValue("[25+ seat quote]");
    expect(screen.queryByText(/€399/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Fundamentals Core/i)).not.toBeInTheDocument();
  });

  it("prepends the seat-quote marker to stored notes even if the field is cleared", async () => {
    insertMock.mockClear();

    render(
      <TrainingInterestDialog
        open
        intent="quote"
        quoteVariant="seat_quote"
        onOpenChange={() => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText(/notes/i), { target: { value: "Need 40 seats" } });
    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: "lead@acme.com" } });
    fireEvent.change(screen.getByLabelText(/headcount/i), { target: { value: "40" } });
    fireEvent.click(screen.getByRole("button", { name: /^request a quote$/i }));

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalled();
    });
    const payload = insertMock.mock.calls[0]?.[0] as { notes?: string; intent?: string };
    expect(payload.intent).toBe("quote");
    expect(payload.notes).toBe("[25+ seat quote] Need 40 seats");
  });
});
