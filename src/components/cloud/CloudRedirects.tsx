import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizations } from "@/hooks/useOrganizations";
import {
  CLOUD_PUBLIC_HOME,
  cloudLoginRedirect,
  dashboardCloudEnginePath,
  dashboardCloudHomePath,
} from "@/lib/cloudPaths";

function CloudRedirectPending() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading…</div>
    </div>
  );
}

export function CloudIndexRedirect() {
  const { user, loading } = useAuth();
  const { organizations, loading: orgsLoading } = useOrganizations();

  if (loading) return <CloudRedirectPending />;
  if (!user) return <Navigate to={CLOUD_PUBLIC_HOME} replace />;
  if (orgsLoading) return <CloudRedirectPending />;

  return <Navigate to={dashboardCloudHomePath(organizations[0]?.slug)} replace />;
}

export function CloudEngineRedirect() {
  const { engineId } = useParams<{ engineId: string }>();
  const { user, loading } = useAuth();
  const { organizations, loading: orgsLoading } = useOrganizations();
  const returnPath = `/cloud/engines/${engineId ?? ""}`;

  if (loading) return <CloudRedirectPending />;
  if (!user) return <Navigate to={cloudLoginRedirect(returnPath)} replace />;
  if (orgsLoading) return <CloudRedirectPending />;

  return (
    <Navigate to={dashboardCloudEnginePath(engineId ?? "", organizations[0]?.slug)} replace />
  );
}
