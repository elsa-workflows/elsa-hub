import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { CloudOrgPicker } from "@/components/cloud/CloudOrgPicker";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizations } from "@/hooks/useOrganizations";
import {
  DASHBOARD_CLOUD_PATH,
  dashboardCloudRouteDecision,
  getLegacyCloudRedirectTarget,
  type OrgCloudMembershipDecision,
} from "@/lib/cloudPaths";
import {
  preferredCloudOrgSlug,
  readStoredOrganization,
  rememberSelectedOrganization,
} from "@/lib/selectedOrganization";

function CloudRedirectPending() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading…</div>
    </div>
  );
}

export function useOrgCloudMembership(): OrgCloudMembershipDecision {
  const { pathname } = useLocation();
  const { organizations, loading } = useOrganizations();
  return dashboardCloudRouteDecision(
    pathname,
    organizations,
    loading,
    readStoredOrganization()?.slug,
  );
}

export function OrgCloudMembershipGate({ children }: { children: React.ReactNode }) {
  const { pathname, search, hash } = useLocation();
  const { organizations } = useOrganizations();
  const decision = useOrgCloudMembership();

  useEffect(() => {
    const orgMatch = pathname.match(/^\/dashboard\/org\/([^/]+)/);
    if (!orgMatch) return;
    const org = organizations.find((item) => item.slug === orgMatch[1]);
    if (org) {
      rememberSelectedOrganization({ id: org.id, name: org.name, slug: org.slug });
    }
  }, [pathname, organizations]);

  if (decision.kind === "pending") return <CloudRedirectPending />;
  if (decision.kind === "redirect") return <Navigate to={`${decision.to}${search}${hash}`} replace />;
  if (decision.kind === "pickOrg") {
    return (
      <CloudOrgPicker
        organizations={organizations}
        suffix={`${pathname.slice(DASHBOARD_CLOUD_PATH.length)}${search}${hash}`}
      />
    );
  }
  return children;
}

export function LegacyCloudRedirect() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const { organizations, loading: orgsLoading } = useOrganizations();

  if (loading) return <CloudRedirectPending />;
  if (user && orgsLoading) return <CloudRedirectPending />;

  return (
    <Navigate
      to={getLegacyCloudRedirectTarget(location, {
        signedIn: Boolean(user),
        orgSlug: preferredCloudOrgSlug(organizations, readStoredOrganization()?.slug) ?? null,
      })}
      replace
    />
  );
}
