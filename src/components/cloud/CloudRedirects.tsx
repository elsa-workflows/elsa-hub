import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizations } from "@/hooks/useOrganizations";
import {
  dashboardCloudRouteDecision,
  getLegacyCloudRedirectTarget,
  type OrgCloudMembershipDecision,
} from "@/lib/cloudPaths";

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
  return dashboardCloudRouteDecision(pathname, organizations, loading);
}

export function OrgCloudMembershipGate({ children }: { children: React.ReactNode }) {
  const { search, hash } = useLocation();
  const decision = useOrgCloudMembership();
  if (decision.kind === "pending") return <CloudRedirectPending />;
  if (decision.kind === "redirect") return <Navigate to={`${decision.to}${search}${hash}`} replace />;
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
        orgSlug: organizations[0]?.slug,
      })}
      replace
    />
  );
}
