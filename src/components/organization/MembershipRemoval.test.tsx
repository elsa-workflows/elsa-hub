import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const navigate = vi.fn();
const toast = vi.fn();
const deleteCalls: Array<{ filters: Array<[string, string]>; selected: string | null }> = [];
let deleteResult: { data: Array<{ id: string }> | null; error: Error | null } = { data: [], error: null };

vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table !== "organization_members") throw new Error(`unexpected table ${table}`);
      return {
        delete: () => {
          const call = { filters: [] as Array<[string, string]>, selected: null as string | null };
          deleteCalls.push(call);
          const builder = {
            eq: (column: string, value: string) => {
              call.filters.push([column, value]);
              return builder;
            },
            select: (columns: string) => {
              call.selected = columns;
              return Promise.resolve(deleteResult);
            },
          };
          return builder;
        },
      };
    },
  },
}));

import { LeaveOrganizationDialog } from "./LeaveOrganizationDialog";
import { RemoveMemberDialog } from "./RemoveMemberDialog";

async function confirm(trigger: RegExp, action: RegExp) {
  fireEvent.click(screen.getByRole("button", { name: trigger }));
  fireEvent.click(await screen.findByRole("button", { name: action }));
}

describe("membership removal", () => {
  beforeEach(() => {
    navigate.mockClear();
    toast.mockClear();
    deleteCalls.length = 0;
  });

  it("leaving deletes the caller's membership row and asks for it back", async () => {
    deleteResult = { data: [{ id: "m-1" }], error: null };
    render(<LeaveOrganizationDialog organizationId="org-1" organizationName="Acme" userRole="member" />);

    await confirm(/^leave$/i, /leave organization/i);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/dashboard"));
    expect(deleteCalls).toEqual([
      { filters: [["organization_id", "org-1"], ["user_id", "user-1"]], selected: "id" },
    ]);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Left organization" }));
  });

  it("leaving reports an error when RLS deleted nothing", async () => {
    deleteResult = { data: [], error: null };
    render(<LeaveOrganizationDialog organizationId="org-1" organizationName="Acme" userRole="member" />);

    await confirm(/^leave$/i, /leave organization/i);

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Error", variant: "destructive" })),
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it("removing a member deletes the row by id", async () => {
    deleteResult = { data: [{ id: "m-2" }], error: null };
    const onRemoved = vi.fn();
    render(<RemoveMemberDialog memberId="m-2" memberName="Ada" organizationName="Acme" onRemoved={onRemoved} />);

    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(await screen.findByRole("button", { name: /^remove/i }));

    await waitFor(() => expect(onRemoved).toHaveBeenCalled());
    expect(deleteCalls).toEqual([{ filters: [["id", "m-2"]], selected: "id" }]);
  });

  it("removing a member reports an error when RLS deleted nothing", async () => {
    deleteResult = { data: [], error: null };
    const onRemoved = vi.fn();
    render(<RemoveMemberDialog memberId="m-2" memberName="Ada" organizationName="Acme" onRemoved={onRemoved} />);

    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(await screen.findByRole("button", { name: /^remove/i }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Error", variant: "destructive" })),
    );
    expect(onRemoved).not.toHaveBeenCalled();
  });
});
