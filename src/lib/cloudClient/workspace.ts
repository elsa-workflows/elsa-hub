import type { CloudWorkspace } from "@/lib/cloud";

function isOwner(role: string) {
  return role.toLowerCase() === "owner";
}

/**
 * Same preference as Control `POST /api/cloud/bootstrap`:
 * owner organization first, then workspace owner, then organization id, then workspace id.
 */
export function selectPreferredCloudWorkspace(
  workspaces: CloudWorkspace[],
): CloudWorkspace | undefined {
  if (workspaces.length === 0) return undefined;
  return [...workspaces].sort((left, right) => {
    const orgOwner = Number(isOwner(right.organizationRole)) - Number(isOwner(left.organizationRole));
    if (orgOwner !== 0) return orgOwner;
    const workspaceOwner = Number(isOwner(right.role)) - Number(isOwner(left.role));
    if (workspaceOwner !== 0) return workspaceOwner;
    const organization = left.organizationId.localeCompare(right.organizationId);
    if (organization !== 0) return organization;
    return left.id.localeCompare(right.id);
  })[0];
}
