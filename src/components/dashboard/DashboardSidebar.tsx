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

const orgNavItems = [
  { label: "Overview", icon: LayoutDashboard, path: "" },
  { label: "Orders", icon: Receipt, path: "orders" },
  { label: "Credits", icon: Coins, path: "credits" },
  { label: "Team", icon: Users, path: "team" },
  { label: "Settings", icon: Settings, path: "settings" },
];

const providerNavItems = [
  { label: "Overview", icon: LayoutDashboard, path: "" },
  { label: "Customers", icon: Building2, path: "customers" },
  { label: "Work Logs", icon: Clock, path: "work-logs" },
  { label: "Bundles", icon: Package, path: "bundles" },
  { label: "Settings", icon: Settings, path: "settings" },
];

export function DashboardSidebar() {
  const location = useLocation();
  const { contextType, slug } = useDashboardContext();

  const navItems = contextType === "provider" ? providerNavItems : orgNavItems;
  const basePath = contextType && slug ? `/dashboard/${contextType}/${slug}` : "/dashboard";

  const isActive = (itemPath: string) => {
    const fullPath = itemPath ? `${basePath}/${itemPath}` : basePath;
    // Exact match for root, starts with for sub-paths
    if (itemPath === "") {
      return location.pathname === basePath || location.pathname === `${basePath}/`;
    }
    return location.pathname.startsWith(fullPath);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-3">
        <ContextSwitcher />
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {contextType === "provider" ? "Provider" : "Organization"}
          </SidebarGroupLabel>
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
