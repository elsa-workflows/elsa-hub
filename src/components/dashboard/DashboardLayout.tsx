import { Suspense, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { RouteFallback } from "@/components/RouteFallback";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardProvider } from "@/contexts/DashboardContext";
import { useAuth } from "@/contexts/AuthContext";

function DashboardPageFallback() {
  return <RouteFallback className="min-h-[50vh]" />;
}

export function DashboardLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      // Redirect to login with return URL
      const returnUrl = encodeURIComponent(location.pathname + location.search);
      navigate(`/login?redirect=${returnUrl}`);
    }
  }, [user, loading, navigate, location]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <DashboardSidebar />
          <SidebarInset>
            <DashboardHeader />
            <main className="flex-1 overflow-auto">
              {/* Keep the dashboard chrome mounted when a lazy page suspends.
                  The app-level Suspense around <Routes> would otherwise unmount
                  the sidebar and look like a full reload. */}
              <Suspense fallback={<DashboardPageFallback />}>
                <Outlet />
              </Suspense>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </DashboardProvider>
  );
}
