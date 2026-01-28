import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { ScrollToTop } from "@/components/ScrollToTop";
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
import Account from "./pages/Account";
import OrganizationDashboard from "./pages/OrganizationDashboard";
import AcceptInvitation from "./pages/AcceptInvitation";
import NotFound from "./pages/NotFound";

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
              <Route path="/account" element={<Account />} />
              <Route path="/org/:slug" element={<OrganizationDashboard />} />
              <Route path="/invite/:token" element={<AcceptInvitation />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </OrganizationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
