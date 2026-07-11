import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Github, ExternalLink, User, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/notifications";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import elsaLogo from "@/assets/elsa-logo.png";
import { cn } from "@/lib/utils";

type NavItem = { label: string; to?: string; href?: string; badge?: string; external?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    label: "Product",
    items: [
      { label: "Overview", to: "/" },
      { label: "Features", to: "/features" },
      {
        label: "Elsa Platform",
        href: "https://github.com/elsa-workflows/elsa-platform",
        badge: "Open source · Preview",
        external: true,
      },
    ],
  },
  {
    label: "Developers",
    items: [
      { label: "Get Started", to: "/get-started" },
      { label: "Documentation", href: "https://docs.elsaworkflows.io/", external: true },
      { label: "GitHub", href: "https://github.com/elsa-workflows/elsa-core", external: true },
    ],
  },
  {
    label: "Community",
    items: [
      { label: "Blog", to: "/blog" },
      { label: "Roadmap", to: "/roadmap" },
      { label: "Discord", href: "https://discord.gg/hhChk5H472", external: true },
      { label: "Radar", to: "/community/radar" },
      { label: "Resources", to: "/resources" },
    ],
  },
  {
    label: "Elsa+",
    items: [
      { label: "Overview", to: "/elsa-plus" },
      { label: "Docker Images", to: "/elsa-plus/docker-images", badge: "Early Preview" },
      { label: "Runtime Builder", to: "/elsa-plus/runtime-builder", badge: "Preview" },
      { label: "Expert Services", to: "/elsa-plus/expert-services" },
      { label: "Training", to: "/elsa-plus/training" },
    ],
  },
];

function isGroupActive(group: NavGroup, pathname: string) {
  return group.items.some((it) => it.to && (it.to === "/" ? pathname === "/" : pathname.startsWith(it.to)));
}

function GroupTrigger({ group, pathname }: { group: NavGroup; pathname: string }) {
  const active = isGroupActive(group, pathname);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap",
            active
              ? "text-brand bg-primary/5"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          {group.label}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        {group.items.map((item) => {
          const isActive = !!item.to && (item.to === "/" ? pathname === "/" : pathname.startsWith(item.to));
          return item.href ? (
            <DropdownMenuItem key={item.label} asChild>
              <a href={item.href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  {item.label}
                  {item.badge && (
                    <span className="text-[10px] font-medium uppercase tracking-wider rounded border border-border px-1.5 py-0.5 text-muted-foreground">
                      {item.badge}
                    </span>
                  )}
                </span>
                <ExternalLink className="h-3.5 w-3.5 opacity-60" />
              </a>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem key={item.label} asChild>
              <Link to={item.to!} aria-current={isActive ? "page" : undefined} className="flex items-center justify-between gap-3">
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] font-medium uppercase tracking-wider rounded border border-border px-1.5 py-0.5 text-muted-foreground">
                    {item.badge}
                  </span>
                )}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user, loading, signOut } = useAuth();
  const { pathname } = useLocation();

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 10);
        ticking = false;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-colors duration-200",
        scrolled
          ? "bg-background/95 border-b border-border backdrop-blur"
          : "bg-background border-b border-transparent",
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity whitespace-nowrap">
          <img src={elsaLogo} alt="Elsa Workflows" className="h-8 w-8" />
          <span className="text-lg font-semibold tracking-tight whitespace-nowrap">
            Elsa <span className="text-brand">Workflows</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {groups.map((g) => (
            <GroupTrigger key={g.label} group={g} pathname={pathname} />
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <a href="https://docs.elsaworkflows.io/" target="_blank" rel="noopener noreferrer" className="gap-1.5">
              Docs
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5" asChild>
            <a href="https://github.com/elsa-workflows/elsa-core" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <Github className="h-4 w-4" />
            </a>
          </Button>
          <ThemeToggle />
          {!loading && (
            <>
              {user ? (
                <>
                  <NotificationBell />
                  <Button variant="ghost" size="sm" className="gap-2" asChild>
                    <Link to="/dashboard">
                      <User className="h-4 w-4" />
                      Dashboard
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => signOut()}>
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/login">Sign in</Link>
                  </Button>
                  <Button variant="default" size="sm" asChild>
                    <Link to="/get-started">Get started</Link>
                  </Button>
                </>
              )}
            </>
          )}
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[320px] sm:w-[380px] overflow-y-auto">
            <SheetHeader className="sr-only">
              <SheetTitle>Site navigation</SheetTitle>
              <SheetDescription>
                Browse Elsa Workflows product, developer, community, and Elsa+ links.
              </SheetDescription>
            </SheetHeader>
            <nav className="flex flex-col gap-6 mt-8">
              {groups.map((group) => (
                <div key={group.label} className="flex flex-col gap-1">
                  <div className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    {group.label}
                  </div>
                  {group.items.map((item) => {
                    const isActive = !!item.to && (item.to === "/" ? pathname === "/" : pathname.startsWith(item.to));
                    return item.href ? (
                      <a
                        key={item.label}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setOpen(false)}
                        className="px-3 py-2 text-base rounded-lg hover:bg-muted transition-colors flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2">
                          {item.label}
                          {item.badge && (
                            <span className="text-[10px] font-medium uppercase tracking-wider rounded border border-border px-1.5 py-0.5 text-muted-foreground">
                              {item.badge}
                            </span>
                          )}
                        </span>
                        <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                      </a>
                    ) : (
                      <Link
                        key={item.label}
                        to={item.to!}
                        onClick={() => setOpen(false)}
                        aria-current={isActive ? "page" : undefined}
                        className="px-3 py-2 text-base rounded-lg hover:bg-muted transition-colors flex items-center justify-between"
                      >
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="text-[10px] font-medium uppercase tracking-wider rounded border border-border px-1.5 py-0.5 text-muted-foreground">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>

              ))}

              <hr />

              <div className="px-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Theme</span>
                <ThemeToggle />
              </div>

              {!loading && (
                <div className="flex flex-col gap-2">
                  {user ? (
                    <>
                      <Link
                        to="/dashboard"
                        onClick={() => setOpen(false)}
                        className="px-3 py-2 text-base rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
                      >
                        <User className="h-4 w-4" />
                        Dashboard
                      </Link>
                      <button
                        onClick={() => {
                          signOut();
                          setOpen(false);
                        }}
                        className="px-3 py-2 text-base rounded-lg hover:bg-muted transition-colors flex items-center gap-2 text-left"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        onClick={() => setOpen(false)}
                        className="px-3 py-2 text-base rounded-lg hover:bg-muted transition-colors text-center"
                      >
                        Sign in
                      </Link>
                      <Link
                        to="/get-started"
                        onClick={() => setOpen(false)}
                        className="px-3 py-2 text-base font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-center"
                      >
                        Get started
                      </Link>
                    </>
                  )}
                </div>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
