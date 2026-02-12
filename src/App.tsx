import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { ScrollToTop } from "@/components/ScrollToTop";
import { SpaceBackground } from "@/components/space";

// Public pages
import Home from "./pages/Home";
import GetStarted from "./pages/GetStarted";
import ElsaServer from "./pages/get-started/ElsaServer";
import ElsaStudio from "./pages/get-started/ElsaStudio";
import ElsaServerAndStudio from "./pages/get-started/ElsaServerAndStudio";
import Docker from "./pages/get-started/Docker";
import ElsaPlus from "./pages/ElsaPlus";
import ExpertServicesProviders from "./pages/enterprise/ExpertServicesProviders";
import ExpertServiceProvider from "./pages/enterprise/ExpertServiceProvider";
import DockerImages from "./pages/enterprise/DockerImages";
import CloudServices from "./pages/enterprise/CloudServices";
import Training from "./pages/enterprise/Training";
import Resources from "./pages/Resources";
import CommunityContent from "./pages/resources/CommunityContent";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ConfirmEmail from "./pages/signup/ConfirmEmail";
import AuthCallback from "./pages/auth/AuthCallback";
import AcceptInvitation from "./pages/AcceptInvitation";
import Unsubscribe from "./pages/Unsubscribe";
import NotFound from "./pages/NotFound";

// Dashboard
import { DashboardLayout } from "@/components/dashboard";
import DashboardHome from "./pages/dashboard/DashboardHome";
import ProfileSettings from "./pages/dashboard/settings/ProfileSettings";
import NotificationSettings from "./pages/dashboard/settings/NotificationSettings";
import OrgOverview from "./pages/dashboard/org/OrgOverview";
import OrgOrders from "./pages/dashboard/org/OrgOrders";
import OrgCredits from "./pages/dashboard/org/OrgCredits";
import OrgTeam from "./pages/dashboard/org/OrgTeam";
import OrgActivity from "./pages/dashboard/org/OrgActivity";
import OrgSettings from "./pages/dashboard/org/OrgSettings";
import ProviderOverview from "./pages/dashboard/provider/ProviderOverview";
import ProviderUsage from "./pages/dashboard/provider/ProviderUsage";
import ProviderOrders from "./pages/dashboard/provider/ProviderOrders";
import ProviderCustomers from "./pages/dashboard/provider/ProviderCustomers";
import ProviderWorkLogs from "./pages/dashboard/provider/ProviderWorkLogs";
import ProviderBundles from "./pages/dashboard/provider/ProviderBundles";
import ProviderSettings from "./pages/dashboard/provider/ProviderSettings";
import AdminOverview from "./pages/dashboard/admin/AdminOverview";
import AdminUsers from "./pages/dashboard/admin/AdminUsers";
import AdminOrganizations from "./pages/dashboard/admin/AdminOrganizations";
import AdminOrders from "./pages/dashboard/admin/AdminOrders";
import AdminInvitations from "./pages/dashboard/admin/AdminInvitations";
import AdminAudit from "./pages/dashboard/admin/AdminAudit";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <SpaceBackground />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <AuthProvider>
            <OrganizationProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/get-started" element={<GetStarted />} />
              <Route path="/get-started/docker" element={<Docker />} />
              <Route path="/get-started/elsa-server" element={<ElsaServer />} />
              <Route path="/get-started/elsa-studio" element={<ElsaStudio />} />
              <Route path="/get-started/elsa-server-and-studio" element={<ElsaServerAndStudio />} />
              <Route path="/elsa-plus" element={<ElsaPlus />} />
              <Route path="/elsa-plus/expert-services" element={<ExpertServicesProviders />} />
              <Route path="/elsa-plus/expert-services/:slug" element={<ExpertServiceProvider />} />
              <Route path="/elsa-plus/production-docker" element={<DockerImages />} />
              <Route path="/elsa-plus/cloud-services" element={<CloudServices />} />
              <Route path="/elsa-plus/training" element={<Training />} />
              {/* Backward compatibility redirects */}
              <Route path="/enterprise" element={<Navigate to="/elsa-plus" replace />} />
              <Route path="/enterprise/expert-services" element={<Navigate to="/elsa-plus/expert-services" replace />} />
              <Route path="/enterprise/docker-images" element={<Navigate to="/elsa-plus/production-docker" replace />} />
              <Route path="/enterprise/cloud-services" element={<Navigate to="/elsa-plus/cloud-services" replace />} />
              <Route path="/enterprise/training" element={<Navigate to="/elsa-plus/training" replace />} />
              <Route path="/marketplace" element={<Navigate to="/elsa-plus" replace />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/resources/community-content" element={<CommunityContent />} />
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
                <Route path="provider/:slug" element={<ProviderOverview />} />
                <Route path="provider/:slug/usage" element={<ProviderUsage />} />
                <Route path="provider/:slug/orders" element={<ProviderOrders />} />
                <Route path="provider/:slug/customers" element={<ProviderCustomers />} />
                <Route path="provider/:slug/work-logs" element={<ProviderWorkLogs />} />
                <Route path="provider/:slug/bundles" element={<ProviderBundles />} />
                <Route path="provider/:slug/settings" element={<ProviderSettings />} />
                {/* Admin Routes */}
                <Route path="admin" element={<AdminOverview />} />
                <Route path="admin/users" element={<AdminUsers />} />
                <Route path="admin/organizations" element={<AdminOrganizations />} />
                <Route path="admin/orders" element={<AdminOrders />} />
                <Route path="admin/invitations" element={<AdminInvitations />} />
                <Route path="admin/audit" element={<AdminAudit />} />
              </Route>

              {/* Backward Compatibility Redirects */}
              <Route path="/account" element={<Navigate to="/dashboard" replace />} />
              <Route path="/org/:slug" element={<OrgRedirect />} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </OrganizationProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

// Redirect component for old org URLs
function OrgRedirect() {
  const slug = window.location.pathname.split("/org/")[1];
  return <Navigate to={`/dashboard/org/${slug}`} replace />;
}

export default App;
