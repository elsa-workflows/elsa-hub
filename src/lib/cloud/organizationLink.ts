export function isHubOrgAdmin(role: string | undefined): boolean {
  return role === "admin" || role === "owner";
}

export function shouldEnsureCloudOrganizationLink(input: {
  hubOrganizationId?: string;
  isOrgAdmin: boolean;
  linkLoading: boolean;
  linked: boolean;
  persistPending: boolean;
  alreadyAttempted: boolean;
}): boolean {
  return Boolean(
    input.hubOrganizationId &&
      input.isOrgAdmin &&
      !input.linkLoading &&
      !input.linked &&
      !input.persistPending &&
      !input.alreadyAttempted,
  );
}
