import { createContext, useContext, ReactNode, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";

type ContextType = "org" | "provider" | null;

interface DashboardContextValue {
  contextType: ContextType;
  slug: string | null;
  navigateToContext: (type: "org" | "provider", slug: string, path?: string) => void;
  navigateToProfile: () => void;
  isOrgContext: boolean;
  isProviderContext: boolean;
}

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Derive context from URL
  const contextType: ContextType = useMemo(() => {
    if (location.pathname.startsWith("/dashboard/org/")) return "org";
    if (location.pathname.startsWith("/dashboard/provider/")) return "provider";
    return null;
  }, [location.pathname]);

  const slug = params.slug || null;

  const navigateToContext = (type: "org" | "provider", targetSlug: string, path?: string) => {
    const basePath = `/dashboard/${type}/${targetSlug}`;
    navigate(path ? `${basePath}/${path}` : basePath);
  };

  const navigateToProfile = () => {
    navigate("/dashboard/settings");
  };

  const value: DashboardContextValue = {
    contextType,
    slug,
    navigateToContext,
    navigateToProfile,
    isOrgContext: contextType === "org",
    isProviderContext: contextType === "provider",
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardContext() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error("useDashboardContext must be used within a DashboardProvider");
  }
  return context;
}
