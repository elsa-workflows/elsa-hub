import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Receipt,
  Coins,
  Users,
  Settings,
  Building2,
  Clock,
  Package,
  User,
  BarChart3,
  Shield,
  Mail,
  FileText,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { ContextSwitcher } from "./ContextSwitcher";
import { useDashboardContext } from "@/contexts/DashboardContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";

const orgNavItems = [
  { label: "Overview", icon: LayoutDashboard, path: "" },
  { label: "Orders", icon: Receipt, path: "orders" },
  { label: "Credits", icon: Coins, path: "credits" },
  { label: "Team", icon: Users, path: "team" },
  { label: "Settings", icon: Settings, path: "settings" },
];

const providerNavItems = [
  { label: "Overview", icon: LayoutDashboard, path: "" },
  { label: "Usage", icon: BarChart3, path: "usage" },
  { label: "Orders", icon: Receipt, path: "orders" },
  { label: "Customers", icon: Building2, path: "customers" },
  { label: "Work Logs", icon: Clock, path: "work-logs" },
  { label: "Bundles", icon: Package, path: "bundles" },
  { label: "Settings", icon: Settings, path: "settings" },
];

const adminNavItems = [
  { label: "Overview", icon: LayoutDashboard, path: "" },
  { label: "Users", icon: Users, path: "users" },
  { label: "Organizations", icon: Building2, path: "organizations" },
  { label: "Orders", icon: Receipt, path: "orders" },
  { label: "Invitations", icon: Mail, path: "invitations" },
  { label: "Audit Log", icon: FileText, path: "audit" },
];

export function DashboardSidebar() {
  const location = useLocation();
  const { contextType, slug, isAdminContext } = useDashboardContext();
  const { data: isAdmin } = useIsAdmin();

  const getNavItems = () => {
    if (isAdminContext) return adminNavItems;
    if (contextType === "provider") return providerNavItems;
    return orgNavItems;
  };

  const getBasePath = () => {
    if (isAdminContext) return "/dashboard/admin";
    if (contextType && slug) return `/dashboard/${contextType}/${slug}`;
    return "/dashboard";
  };

  const navItems = getNavItems();
  const basePath = getBasePath();

  const isActive = (itemPath: string) => {
    const fullPath = itemPath ? `${basePath}/${itemPath}` : basePath;
    if (itemPath === "") {
      return location.pathname === basePath || location.pathname === `${basePath}/`;
    }
    return location.pathname.startsWith(fullPath);
  };

  const getGroupLabel = () => {
    if (isAdminContext) return "Platform Admin";
    if (contextType === "provider") return "Provider";
    return "Organization";
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-3">
        <ContextSwitcher />
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{getGroupLabel()}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.path)}
                    tooltip={item.label}
                  >
                    <Link to={item.path ? `${basePath}/${item.path}` : basePath}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          {isAdmin && !isAdminContext && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={location.pathname.startsWith("/dashboard/admin")}
                tooltip="Admin"
              >
                <Link to="/dashboard/admin">
                  <Shield className="h-4 w-4" />
                  <span>Admin</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location.pathname === "/dashboard/settings"}
              tooltip="Profile"
            >
              <Link to="/dashboard/settings">
                <User className="h-4 w-4" />
                <span>Profile</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
