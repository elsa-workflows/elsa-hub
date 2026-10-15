import { useLocation, useParams } from "react-router-dom";

export const ELSACLOUD_APP_URL = "https://elsacloud.app";
export const CLOUD_PUBLIC_HOME = "/elsa-plus/cloud-services";
export const DASHBOARD_CLOUD_PATH = "/dashboard/cloud";

export function dashboardCloudHomePath(orgSlug?: string | null): string {
  return orgSlug ? `/dashboard/org/${orgSlug}/cloud` : DASHBOARD_CLOUD_PATH;
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
