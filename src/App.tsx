import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { ScrollToTop } from "@/components/ScrollToTop";

// Public pages
import Home from "./pages/Home";
import GetStarted from "./pages/GetStarted";
import ElsaServer from "./pages/get-started/ElsaServer";
import ElsaStudio from "./pages/get-started/ElsaStudio";
import ElsaServerAndStudio from "./pages/get-started/ElsaServerAndStudio";
import Docker from "./pages/get-started/Docker";
import Enterprise from "./pages/Enterprise";
import ExpertServices from "./pages/enterprise/ExpertServices";
import DockerImages from "./pages/enterprise/DockerImages";
import CloudServices from "./pages/enterprise/CloudServices";
import Training from "./pages/enterprise/Training";
import Marketplace from "./pages/Marketplace";
import Resources from "./pages/Resources";
import CommunityContent from "./pages/resources/CommunityContent";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ConfirmEmail from "./pages/signup/ConfirmEmail";
import AuthCallback from "./pages/auth/AuthCallback";
import AcceptInvitation from "./pages/AcceptInvitation";
import NotFound from "./pages/NotFound";

// Dashboard
import { DashboardLayout } from "@/components/dashboard";
import DashboardHome from "./pages/dashboard/DashboardHome";
import ProfileSettings from "./pages/dashboard/settings/ProfileSettings";
import OrgOverview from "./pages/dashboard/org/OrgOverview";
import OrgOrders from "./pages/dashboard/org/OrgOrders";
import OrgCredits from "./pages/dashboard/org/OrgCredits";
import OrgTeam from "./pages/dashboard/org/OrgTeam";
import OrgSettings from "./pages/dashboard/org/OrgSettings";
import ProviderOverview from "./pages/dashboard/provider/ProviderOverview";
import ProviderOrders from "./pages/dashboard/provider/ProviderOrders";
import ProviderCustomers from "./pages/dashboard/provider/ProviderCustomers";
import ProviderWorkLogs from "./pages/dashboard/provider/ProviderWorkLogs";
import ProviderBundles from "./pages/dashboard/provider/ProviderBundles";
import ProviderSettings from "./pages/dashboard/provider/ProviderSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
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
              <Route path="/enterprise" element={<Enterprise />} />
              <Route path="/enterprise/expert-services" element={<ExpertServices />} />
              <Route path="/enterprise/docker-images" element={<DockerImages />} />
              <Route path="/enterprise/cloud-services" element={<CloudServices />} />
              <Route path="/enterprise/training" element={<Training />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/resources/community-content" element={<CommunityContent />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/signup/confirm-email" element={<ConfirmEmail />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/invite/:token" element={<AcceptInvitation />} />

              {/* Dashboard Routes */}
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<DashboardHome />} />
                <Route path="settings" element={<ProfileSettings />} />
                <Route path="org/:slug" element={<OrgOverview />} />
                <Route path="org/:slug/orders" element={<OrgOrders />} />
                <Route path="org/:slug/credits" element={<OrgCredits />} />
                <Route path="org/:slug/team" element={<OrgTeam />} />
                <Route path="org/:slug/settings" element={<OrgSettings />} />
                <Route path="provider/:slug" element={<ProviderOverview />} />
                <Route path="provider/:slug/orders" element={<ProviderOrders />} />
                <Route path="provider/:slug/customers" element={<ProviderCustomers />} />
                <Route path="provider/:slug/work-logs" element={<ProviderWorkLogs />} />
                <Route path="provider/:slug/bundles" element={<ProviderBundles />} />
                <Route path="provider/:slug/settings" element={<ProviderSettings />} />
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
  </QueryClientProvider>
);

// Redirect component for old org URLs
function OrgRedirect() {
  const slug = window.location.pathname.split("/org/")[1];
  return <Navigate to={`/dashboard/org/${slug}`} replace />;
}

export default App;
