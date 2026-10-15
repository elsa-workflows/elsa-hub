import { Link, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
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
  Activity,
  MessageSquare,
  CalendarDays,
  Layers,
  Radar,
  KeyRound,
  Inbox,
  GraduationCap,
  Cloud,
  Server,
  Compass,
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { ContextSwitcher } from "./ContextSwitcher";
import { useDashboardContext } from "@/contexts/DashboardContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useOwnedHubProducts } from "@/hooks/useOwnedHubProducts";
import { dashboardCloudHomePath } from "@/lib/cloudPaths";

type NavItem = {
  label: string;
  icon: LucideIcon;
  path?: string;
  to?: string;
  children?: NavItem[];
};

type NavGroup = {
  label?: string;
  items: NavItem[];
};

const providerNavItems: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, path: "" },
  { label: "Usage", icon: BarChart3, path: "usage" },
  { label: "Orders", icon: Receipt, path: "orders" },
  { label: "Customers", icon: Building2, path: "customers" },
  { label: "Bookings", icon: CalendarDays, path: "bookings" },
  { label: "Workspaces", icon: Layers, path: "workspaces" },
  { label: "Messages", icon: MessageSquare, path: "messages" },
  { label: "Hours", icon: Clock, path: "work-logs" },
  { label: "Bundles", icon: Package, path: "bundles" },
  { label: "Registry access", icon: KeyRound, path: "registry-access" },
  { label: "Enquiries", icon: Inbox, path: "enquiries" },
  { label: "Settings", icon: Settings, path: "settings" },
];

const adminNavItems: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, path: "" },
  { label: "Users", icon: Users, path: "users" },
  { label: "Organizations", icon: Building2, path: "organizations" },
  { label: "Orders", icon: Receipt, path: "orders" },
  { label: "Invitations", icon: Mail, path: "invitations" },
  { label: "Audit Log", icon: FileText, path: "audit" },
  { label: "Radar Map", icon: Radar, path: "radar" },
  { label: "Training leads", icon: GraduationCap, path: "training" },
];

function itemHref(item: NavItem, basePath: string) {
  if (item.to) return item.to;
  return item.path ? `${basePath}/${item.path}` : basePath;
}

function pathIsActive(pathname: string, href: string, exact: boolean) {
  if (exact) {
    return pathname === href || pathname === `${href}/`;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebar({
  productOverride,
}: {
  productOverride?: { ownsCloud: boolean; ownsAcademy: boolean };
} = {}) {
  const location = useLocation();
  const { contextType, slug, isAdminContext } = useDashboardContext();
  const { data: isAdmin } = useIsAdmin();
  const { organizations } = useOrganizations();
  const currentOrg = organizations.find((org) => org.slug === slug);
  const owned = useOwnedHubProducts(currentOrg?.id);
  const ownsCloud = productOverride?.ownsCloud ?? owned.ownsCloud;
  const ownsAcademy = productOverride?.ownsAcademy ?? owned.ownsAcademy;
  const onNoOrgCloud = location.pathname.startsWith("/dashboard/cloud");

  const hasValidContext = isAdminContext || (contextType && slug);
  const cloudHome = dashboardCloudHomePath(contextType === "org" ? slug : null);

  const getBasePath = () => {
    if (isAdminContext) return "/dashboard/admin";
    if (contextType && slug) return `/dashboard/${contextType}/${slug}`;
    return "/dashboard";
  };

  const basePath = getBasePath();

  const orgGroups = (): NavGroup[] => {
    const products: NavItem[] = [];
    if (ownsAcademy) {
      products.push({ label: "Academy", icon: GraduationCap, to: "/academy" });
    }
    if (ownsCloud) {
      products.push({
        label: "Elsa Cloud",
        icon: Cloud,
        to: cloudHome,
        children: [{ label: "Engines", icon: Server, to: cloudHome }],
      });
    }
    if (products.length === 0) {
      products.push({ label: "Explore products", icon: Compass, to: "/academy" });
    }

    return [
      {
        items: [
          { label: "Overview", icon: LayoutDashboard, path: "" },
          { label: "Inbox", icon: Inbox, path: "messages" },
        ],
      },
      {
        label: "Services",
        items: [
          { label: "Engagements", icon: Layers, path: "workspaces" },
          { label: "Bookings", icon: CalendarDays, path: "bookings" },
          { label: "Credits & Hours", icon: Coins, path: "credits" },
          { label: "Orders", icon: Receipt, path: "orders" },
        ],
      },
      { label: "Products", items: products },
      {
        label: "Organization",
        items: [
          { label: "Team", icon: Users, path: "team" },
          { label: "Activity", icon: Activity, path: "activity" },
          { label: "Settings", icon: Settings, path: "settings" },
        ],
      },
    ];
  };

  const getGroups = (): NavGroup[] => {
    if (isAdminContext) return [{ label: "Platform Admin", items: adminNavItems }];
    if (contextType === "provider") return [{ label: "Provider", items: providerNavItems }];
    if (contextType === "org") return orgGroups();
    if (ownsCloud || onNoOrgCloud) {
      return [
        {
          label: "Products",
          items: [{ label: "Elsa Cloud", icon: Cloud, to: dashboardCloudHomePath() }],
        },
      ];
    }
    return [];
  };

  const groups = getGroups();

  const isItemActive = (item: NavItem) => {
    const href = itemHref(item, basePath);
    const exact = !item.path && !item.to;
    return pathIsActive(location.pathname, href, exact);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-3">
        <ContextSwitcher />
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {(hasValidContext || groups.length > 0) &&
          groups.map((group, groupIndex) => (
            <SidebarGroup key={group.label ?? `top-${groupIndex}`}>
              {group.label ? <SidebarGroupLabel>{group.label}</SidebarGroupLabel> : null}
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const href = itemHref(item, basePath);
                    return (
                      <SidebarMenuItem key={`${item.label}-${href}`}>
                        <SidebarMenuButton asChild isActive={isItemActive(item)} tooltip={item.label}>
                          <Link to={href}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                        {item.children && item.children.length > 0 ? (
                          <SidebarMenuSub>
                            {item.children.map((child) => {
                              const childHref = itemHref(child, basePath);
                              return (
                                <SidebarMenuSubItem key={`${child.label}-${childHref}`}>
                                  <SidebarMenuSubButton asChild isActive={isItemActive(child)}>
                                    <Link to={childHref}>
                                      <child.icon className="h-4 w-4" />
                                      <span>{child.label}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        ) : null}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
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
