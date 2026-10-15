import { Navigate, Outlet } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";

export const CLOUD_LOGIN_REDIRECT = "/login?redirect=/cloud";

export function CloudAuthGuard() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={CLOUD_LOGIN_REDIRECT} replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
