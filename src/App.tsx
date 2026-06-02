import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemePreferencesProvider } from "@/contexts/ThemePreferencesContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { ScrollToTop } from "@/components/ScrollToTop";

import { WeaverProvider, WeaverLauncher, WeaverPanel } from "@/components/weaver";

// Home is eager so the initial route paints instantly
import Home from "./pages/Home";

// All other routes are code-split to keep the initial bundle small
const Features = lazy(() => import("./pages/Features"));
const RadarMap = lazy(() => import("./pages/RadarMap"));
const GetStarted = lazy(() => import("./pages/GetStarted"));
const ElsaServer = lazy(() => import("./pages/get-started/ElsaServer"));
const ElsaStudio = lazy(() => import("./pages/get-started/ElsaStudio"));
const ElsaServerAndStudio = lazy(() => import("./pages/get-started/ElsaServerAndStudio"));
const Docker = lazy(() => import("./pages/get-started/Docker"));
const ElsaPlus = lazy(() => import("./pages/ElsaPlus"));
const ExpertServicesProviders = lazy(() => import("./pages/enterprise/ExpertServicesProviders"));
const ExpertServiceProvider = lazy(() => import("./pages/enterprise/ExpertServiceProvider"));
const DockerImages = lazy(() => import("./pages/enterprise/DockerImages"));
const DockerImageDetail = lazy(() => import("./pages/enterprise/DockerImageDetail"));
const CloudServices = lazy(() => import("./pages/enterprise/CloudServices"));
const Training = lazy(() => import("./pages/enterprise/Training"));
const RuntimeBuilderLanding = lazy(() => import("./pages/enterprise/RuntimeBuilderLanding"));
const RuntimeBuilderComposer = lazy(() => import("./pages/enterprise/RuntimeBuilderComposer"));
const ElsaPlatform = lazy(() => import("./pages/enterprise/ElsaPlatform"));
const PlatformDeploymentLoop = lazy(() => import("./pages/enterprise/platform/DeploymentLoop"));
const PlatformDeploymentModel = lazy(() => import("./pages/enterprise/platform/DeploymentModel"));
const PlatformSurfaces = lazy(() => import("./pages/enterprise/platform/Surfaces"));
const PlatformPipeline = lazy(() => import("./pages/enterprise/platform/Pipeline"));
const PlatformRoadmap = lazy(() => import("./pages/enterprise/platform/Roadmap"));

const Resources = lazy(() => import("./pages/Resources"));
const Roadmap = lazy(() => import("./pages/Roadmap"));
const CommunityContent = lazy(() => import("./pages/resources/CommunityContent"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ConfirmEmail = lazy(() => import("./pages/signup/ConfirmEmail"));
const AuthCallback = lazy(() => import("./pages/auth/AuthCallback"));
const AcceptInvitation = lazy(() => import("./pages/AcceptInvitation"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));

// Dashboard
const DashboardLayout = lazy(() =>
  import("@/components/dashboard").then((m) => ({ default: m.DashboardLayout }))
);
const DashboardHome = lazy(() => import("./pages/dashboard/DashboardHome"));
const ProfileSettings = lazy(() => import("./pages/dashboard/settings/ProfileSettings"));
const NotificationSettings = lazy(() => import("./pages/dashboard/settings/NotificationSettings"));
const OrgOverview = lazy(() => import("./pages/dashboard/org/OrgOverview"));
const OrgOrders = lazy(() => import("./pages/dashboard/org/OrgOrders"));
const OrgCredits = lazy(() => import("./pages/dashboard/org/OrgCredits"));
const OrgTeam = lazy(() => import("./pages/dashboard/org/OrgTeam"));
const OrgActivity = lazy(() => import("./pages/dashboard/org/OrgActivity"));
const OrgSettings = lazy(() => import("./pages/dashboard/org/OrgSettings"));
const ProviderOverview = lazy(() => import("./pages/dashboard/provider/ProviderOverview"));
const ProviderUsage = lazy(() => import("./pages/dashboard/provider/ProviderUsage"));
const ProviderOrders = lazy(() => import("./pages/dashboard/provider/ProviderOrders"));
const ProviderCustomers = lazy(() => import("./pages/dashboard/provider/ProviderCustomers"));
const ProviderWorkLogs = lazy(() => import("./pages/dashboard/provider/ProviderWorkLogs"));
const ProviderBundles = lazy(() => import("./pages/dashboard/provider/ProviderBundles"));
const ProviderSettings = lazy(() => import("./pages/dashboard/provider/ProviderSettings"));
const OrgMessages = lazy(() => import("./pages/dashboard/org/OrgMessages"));
const OrgBookings = lazy(() => import("./pages/dashboard/org/OrgBookings"));
const ProviderMessages = lazy(() => import("./pages/dashboard/provider/ProviderMessages"));
const ProviderBookings = lazy(() => import("./pages/dashboard/provider/ProviderBookings"));
const AdminOverview = lazy(() => import("./pages/dashboard/admin/AdminOverview"));
const AdminUsers = lazy(() => import("./pages/dashboard/admin/AdminUsers"));
const AdminOrganizations = lazy(() => import("./pages/dashboard/admin/AdminOrganizations"));
const AdminOrders = lazy(() => import("./pages/dashboard/admin/AdminOrders"));
const AdminInvitations = lazy(() => import("./pages/dashboard/admin/AdminInvitations"));
const AdminAudit = lazy(() => import("./pages/dashboard/admin/AdminAudit"));
const AdminRadarLocations = lazy(() => import("./pages/dashboard/admin/AdminRadarLocations"));
const OrgWorkspaces = lazy(() => import("./pages/dashboard/org/OrgWorkspaces"));
const OrgWorkspace = lazy(() => import("./pages/dashboard/org/OrgWorkspace"));
const ProviderWorkspaces = lazy(() => import("./pages/dashboard/provider/ProviderWorkspaces"));
const ProviderWorkspace = lazy(() => import("./pages/dashboard/provider/ProviderWorkspace"));

const queryClient = new QueryClient();

// Sends browser visitors of the prerendered /blog/<slug>.html download URL
// back to the clean SPA route, so React Router doesn't render NotFound on
// top of the prerendered article.
const BlogHtmlRedirect = () => {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/blog/${slug ?? ""}`} replace />;
};

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="animate-pulse text-muted-foreground">Loading…</div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ThemePreferencesProvider>
      <TooltipProvider>
        
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <AuthProvider>
            <OrganizationProvider>
            <WeaverProvider>
            <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/features" element={<Features />} />
              <Route path="/community/radar" element={<RadarMap />} />
              <Route path="/get-started" element={<GetStarted />} />
              <Route path="/get-started/docker" element={<Docker />} />
              <Route path="/get-started/elsa-server" element={<ElsaServer />} />
              <Route path="/get-started/elsa-studio" element={<ElsaStudio />} />
              <Route path="/get-started/elsa-server-and-studio" element={<ElsaServerAndStudio />} />
              <Route path="/elsa-plus" element={<ElsaPlus />} />
              <Route path="/elsa-plus/expert-services" element={<ExpertServicesProviders />} />
              <Route path="/elsa-plus/expert-services/:slug" element={<ExpertServiceProvider />} />
              <Route path="/elsa-plus/docker-images" element={<DockerImages />} />
              <Route path="/elsa-plus/docker-images/:slug" element={<DockerImageDetail />} />
              <Route path="/elsa-plus/production-docker" element={<Navigate to="/elsa-plus/docker-images" replace />} />
              <Route path="/elsa-plus/docker-images/elsa-pro-studio-blazorserver" element={<Navigate to="/elsa-plus/docker-images/elsa-pro-studio" replace />} />
              <Route path="/elsa-plus/cloud-services" element={<CloudServices />} />
              <Route path="/elsa-plus/training" element={<Training />} />
              <Route path="/elsa-plus/runtime-builder" element={<RuntimeBuilderLanding />} />
              <Route path="/elsa-plus/platform" element={<ElsaPlatform />} />
              <Route path="/elsa-plus/platform/deployment-model" element={<PlatformDeploymentModel />} />
              <Route path="/elsa-plus/platform/deployment-loop" element={<PlatformDeploymentLoop />} />
              <Route path="/elsa-plus/platform/deployment-loop" element={<PlatformDeploymentLoop />} />
              <Route path="/elsa-plus/platform/surfaces" element={<PlatformSurfaces />} />
              <Route path="/elsa-plus/platform/pipeline" element={<PlatformPipeline />} />
              <Route path="/elsa-plus/platform/roadmap" element={<PlatformRoadmap />} />
              <Route path="/elsa-plus/runtime-builder/new" element={<RuntimeBuilderComposer />} />
              <Route path="/elsa-plus/priority-support" element={<Navigate to="/elsa-plus/expert-services/valence-works" replace />} />
              {/* Backward compatibility redirects */}
              <Route path="/enterprise" element={<Navigate to="/elsa-plus" replace />} />
              <Route path="/enterprise/expert-services" element={<Navigate to="/elsa-plus/expert-services" replace />} />
              <Route path="/enterprise/docker-images" element={<Navigate to="/elsa-plus/docker-images" replace />} />
              <Route path="/enterprise/cloud-services" element={<Navigate to="/elsa-plus/cloud-services" replace />} />
              <Route path="/enterprise/training" element={<Navigate to="/elsa-plus/training" replace />} />
              <Route path="/marketplace" element={<Navigate to="/elsa-plus" replace />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              {/* The .html variant is a prerendered download/import target for
                  crawlers and Medium. If a real browser lands on it, send the
                  user to the clean SPA route so React Router doesn't 404. */}
              <Route path="/blog/:slug.html" element={<BlogHtmlRedirect />} />
              <Route path="/resources/community-content" element={<CommunityContent />} />
              <Route path="/roadmap" element={<Roadmap />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/signup/confirm-email" element={<ConfirmEmail />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/invite/:token" element={<AcceptInvitation />} />
              <Route path="/unsubscribe/:token" element={<Unsubscribe />} />

              {/* Dashboard Routes */}
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<DashboardHome />} />
                <Route path="settings" element={<ProfileSettings />} />
                <Route path="settings/notifications" element={<NotificationSettings />} />
                <Route path="org/:slug" element={<OrgOverview />} />
                <Route path="org/:slug/orders" element={<OrgOrders />} />
                <Route path="org/:slug/credits" element={<OrgCredits />} />
                <Route path="org/:slug/team" element={<OrgTeam />} />
                <Route path="org/:slug/activity" element={<OrgActivity />} />
                <Route path="org/:slug/settings" element={<OrgSettings />} />
                <Route path="org/:slug/messages" element={<OrgMessages />} />
                <Route path="org/:slug/messages/:conversationId" element={<OrgMessages />} />
                <Route path="org/:slug/bookings" element={<OrgBookings />} />
                <Route path="org/:slug/workspaces" element={<OrgWorkspaces />} />
                <Route path="org/:slug/workspaces/:providerSlug" element={<OrgWorkspace />} />
                <Route path="provider/:slug" element={<ProviderOverview />} />
                <Route path="provider/:slug/usage" element={<ProviderUsage />} />
                <Route path="provider/:slug/orders" element={<ProviderOrders />} />
                <Route path="provider/:slug/customers" element={<ProviderCustomers />} />
                <Route path="provider/:slug/work-logs" element={<ProviderWorkLogs />} />
                <Route path="provider/:slug/bundles" element={<ProviderBundles />} />
                <Route path="provider/:slug/settings" element={<ProviderSettings />} />
                <Route path="provider/:slug/messages" element={<ProviderMessages />} />
                <Route path="provider/:slug/messages/:conversationId" element={<ProviderMessages />} />
                <Route path="provider/:slug/bookings" element={<ProviderBookings />} />
                <Route path="provider/:slug/workspaces" element={<ProviderWorkspaces />} />
                <Route path="provider/:slug/workspaces/:orgSlug" element={<ProviderWorkspace />} />
                {/* Admin Routes */}
                <Route path="admin" element={<AdminOverview />} />
                <Route path="admin/users" element={<AdminUsers />} />
                <Route path="admin/organizations" element={<AdminOrganizations />} />
                <Route path="admin/orders" element={<AdminOrders />} />
                <Route path="admin/invitations" element={<AdminInvitations />} />
                <Route path="admin/audit" element={<AdminAudit />} />
                <Route path="admin/radar" element={<AdminRadarLocations />} />
              </Route>

              {/* Backward Compatibility Redirects */}
              <Route path="/account" element={<Navigate to="/dashboard" replace />} />
              <Route path="/org/:slug" element={<OrgRedirect />} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            <WeaverLauncher />
            <WeaverPanel />
            </WeaverProvider>
            </OrganizationProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
      </ThemePreferencesProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

// Redirect component for old org URLs
function OrgRedirect() {
  const slug = window.location.pathname.split("/org/")[1];
  return <Navigate to={`/dashboard/org/${slug}`} replace />;
}

export default App;
