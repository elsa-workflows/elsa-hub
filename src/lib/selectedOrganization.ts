/** Same key `OrganizationProvider` uses for the last-used Hub org. */
export const SELECTED_ORGANIZATION_STORAGE_KEY = "selected_organization";

export type StoredOrganization = {
  id: string;
  name: string;
  slug: string;
};

export function readStoredOrganization(): StoredOrganization | null {
  try {
    const raw = localStorage.getItem(SELECTED_ORGANIZATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredOrganization>;
    if (
      typeof parsed.id === "string" &&
      typeof parsed.name === "string" &&
      typeof parsed.slug === "string"
    ) {
      return { id: parsed.id, name: parsed.name, slug: parsed.slug };
    }
    return null;
  } catch {
    return null;
  }
}

export function rememberSelectedOrganization(org: StoredOrganization) {
  try {
    localStorage.setItem(SELECTED_ORGANIZATION_STORAGE_KEY, JSON.stringify(org));
  } catch {
    // Private mode / quota: last-used lasts for this page only.
  }
}

export function preferredCloudOrgSlug(
  organizations: ReadonlyArray<{ slug: string }>,
  preferredSlug?: string | null,
): string | undefined {
  if (organizations.length === 0) return undefined;
  if (organizations.length === 1) return organizations[0].slug;
  if (preferredSlug && organizations.some((org) => org.slug === preferredSlug)) {
    return preferredSlug;
  }
  return undefined;
}
