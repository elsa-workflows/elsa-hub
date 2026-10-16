import { useLocation, useParams } from "react-router-dom";

export const ELSACLOUD_APP_URL = "https://elsacloud.app";
export const CLOUD_PUBLIC_HOME = "/elsa-plus/cloud-services";
export const DASHBOARD_CLOUD_PATH = "/dashboard/cloud";
export const LEGACY_CLOUD_PATH = "/cloud";
export const ELSA_PLUS_CLOUD_PATH = "/elsa-plus/cloud";

/** `/cloud` or `/cloud/…` only — `/cloud-services` must not be rewritten. */
const LEGACY_CLOUD_PREFIX = new RegExp(`^${LEGACY_CLOUD_PATH}(?=/|$)`);
/** `/elsa-plus/cloud` or `/elsa-plus/cloud/…` only — not `/elsa-plus/cloud-services`. */
const ELSA_PLUS_CLOUD_PREFIX = new RegExp(`^${ELSA_PLUS_CLOUD_PATH}(?=/|$)`);

function mapConsolePathname(pathname: string, orgSlug?: string | null): string | null {
  const home = dashboardCloudHomePath(orgSlug);
  if (LEGACY_CLOUD_PREFIX.test(pathname)) {
    return pathname.replace(LEGACY_CLOUD_PREFIX, home);
  }
  if (ELSA_PLUS_CLOUD_PREFIX.test(pathname)) {
    return pathname.replace(ELSA_PLUS_CLOUD_PREFIX, home);
  }
  return null;
}

/**
 * Keep old `/cloud`, `/cloud/*`, `/elsa-plus/cloud` and `/elsa-plus/cloud/*`
 * URLs working. Preserves subpath, query string, and hash. All of these
 * resolve to the dashboard Cloud route. `/elsa-plus/cloud-services` is
 * unchanged.
 */
export function getLegacyCloudRedirectTarget(
  location: { pathname: string; search: string; hash: string },
  options: { signedIn: boolean; orgSlug?: string | null },
): string {
  const suffix = `${location.search}${location.hash}`;
  const mapped = mapConsolePathname(
    location.pathname,
    options.signedIn ? options.orgSlug : null,
  );
  if (!mapped) {
    return `${location.pathname}${suffix}`;
  }
  return `${mapped}${suffix}`;
}

export function dashboardCloudHomePath(orgSlug?: string | null): string {
  return orgSlug ? `/dashboard/org/${orgSlug}/cloud` : DASHBOARD_CLOUD_PATH;
}

export type OrgCloudMembershipDecision =
  | { kind: "stay" }
  | { kind: "pending" }
  | { kind: "redirect"; to: string };

/**
 * `/dashboard/org/:slug/cloud` is only for orgs in `useOrganizations()`.
 * Unknown slugs go to the no-org Cloud route instead of rendering the console.
 */
export function orgCloudMembershipDecision(
  orgSlug: string | undefined,
  organizations: ReadonlyArray<{ slug: string }>,
  orgsLoading: boolean,
): OrgCloudMembershipDecision {
  if (!orgSlug) return { kind: "stay" };
  if (orgsLoading) return { kind: "pending" };
  if (organizations.some((org) => org.slug === orgSlug)) return { kind: "stay" };
  return { kind: "redirect", to: DASHBOARD_CLOUD_PATH };
}

export function dashboardCloudEnginePath(
  engineId: string,
  orgSlug?: string | null,
): string {
  return `${dashboardCloudHomePath(orgSlug)}/engines/${engineId}`;
}

export function cloudLoginRedirect(returnPath: string): string {
  return `/login?redirect=${encodeURIComponent(returnPath)}`;
}

/**
 * Resolve the signed-in Cloud console base path from the current route.
 * `/cloud` remains as a fallback so existing #59 tests keep working.
 */
export function cloudConsoleBasePath(pathname: string, orgSlug?: string | null): string {
  const orgMatch = pathname.match(/^\/dashboard\/org\/([^/]+)/);
  if (orgMatch) {
    return dashboardCloudHomePath(orgMatch[1]);
  }
  if (pathname.startsWith(DASHBOARD_CLOUD_PATH)) {
    return DASHBOARD_CLOUD_PATH;
  }
  if (orgSlug) {
    return dashboardCloudHomePath(orgSlug);
  }
  return "/cloud";
}

export function useCloudConsolePaths() {
  const { slug } = useParams<{ slug?: string }>();
  const { pathname } = useLocation();
  const home = cloudConsoleBasePath(pathname, slug);
  return {
    home,
    engine: (engineId: string) => `${home}/engines/${engineId}`,
  };
}
