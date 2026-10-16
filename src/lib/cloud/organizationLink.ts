export function isHubOrgAdmin(role: string | undefined): boolean {
  return role === "admin" || role === "owner";
}

export type CloudOrganizationLinkView =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "linked" }
  | { kind: "needsLink"; canLink: boolean };

/**
 * Org Cloud routes require a validated `cloud_organization_links` row.
 * The per-user setup marker does not skip this check.
 */
export function cloudOrganizationLinkView(input: {
  hubOrganizationId?: string;
  isOrgAdmin: boolean;
  linkLoading: boolean;
  linked: boolean;
}): CloudOrganizationLinkView {
  if (!input.hubOrganizationId) return { kind: "idle" };
  if (input.linkLoading) return { kind: "pending" };
  if (input.linked) return { kind: "linked" };
  return { kind: "needsLink", canLink: input.isOrgAdmin };
}
