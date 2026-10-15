import { describe, expect, it } from "vitest";
import type { CloudWorkspace } from "@/lib/cloud";
import { selectPreferredCloudWorkspace } from "./workspace";

function workspace(partial: Partial<CloudWorkspace> & Pick<CloudWorkspace, "id">): CloudWorkspace {
  return {
    name: partial.name ?? partial.id,
    kind: "cloud",
    role: "member",
    organizationId: "org-z",
    organizationName: "Other",
    organizationRole: "member",
    ...partial,
  };
}

describe("selectPreferredCloudWorkspace", () => {
  it("prefers the owner organization's workspace, not workspaces[0]", () => {
    const memberOfOther = workspace({
      id: "ws-member",
      organizationId: "org-other",
      organizationName: "Other",
      organizationRole: "member",
      role: "member",
    });
    const owned = workspace({
      id: "ws-owned",
      organizationId: "org-owned",
      organizationName: "Mine",
      organizationRole: "Owner",
      role: "owner",
    });

    expect(selectPreferredCloudWorkspace([memberOfOther, owned])).toEqual(owned);
    expect(selectPreferredCloudWorkspace([owned, memberOfOther])).toEqual(owned);
  });

  it("then prefers a workspace-owner role, then organization and workspace ids", () => {
    const orgOwnerMember = workspace({
      id: "ws-b",
      organizationId: "org-a",
      organizationRole: "owner",
      role: "member",
    });
    const orgOwnerOwner = workspace({
      id: "ws-a",
      organizationId: "org-a",
      organizationRole: "owner",
      role: "owner",
    });
    const laterOrg = workspace({
      id: "ws-c",
      organizationId: "org-b",
      organizationRole: "owner",
      role: "owner",
    });

    expect(selectPreferredCloudWorkspace([laterOrg, orgOwnerMember, orgOwnerOwner])).toEqual(
      orgOwnerOwner,
    );
  });

  it("returns undefined when there are no workspaces", () => {
    expect(selectPreferredCloudWorkspace([])).toBeUndefined();
  });
});
