import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, Github, ExternalLink, User, LogOut, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/notifications";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import elsaLogo from "@/assets/elsa-logo.png";

const navItems = [
  { label: "Home", to: "/" },
  { label: "Get Started", to: "/get-started" },
  { label: "Elsa+", to: "/elsa-plus" },
  { label: "Resources", to: "/resources" },
];

export function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "glass-effect border-b shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <img src={elsaLogo} alt="Elsa Workflows" className="h-9 w-9" />
          <span className="text-xl font-semibold tracking-tight">
            Elsa <span className="text-primary">Workflows</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
              activeClassName="text-primary bg-primary/5"
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <a
              href="https://docs.elsaworkflows.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="gap-2"
            >
              Docs
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a
              href="https://deepwiki.com/elsa-workflows/elsa-core"
              target="_blank"
              rel="noopener noreferrer"
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              DeepWiki
            </a>
          </Button>
          <Button variant="ghost" size="sm" className="gap-2" asChild>
            <a
              href="https://github.com/elsa-workflows/elsa-core"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="h-4 w-4" />
              GitHub
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => signOut()}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </Button>
                </>
              ) : (
                <Button variant="default" size="sm" asChild>
                  <Link to="/login">Sign in</Link>
                </Button>
              )}
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[350px]">
            <nav className="flex flex-col gap-4 mt-8">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="px-4 py-3 text-lg font-medium rounded-lg hover:bg-muted transition-colors"
                  activeClassName="text-primary bg-primary/10"
                >
                  {item.label}
                </NavLink>
              ))}
              <hr className="my-4" />
              <a
                href="https://docs.elsaworkflows.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 text-lg font-medium rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
              >
                Documentation
                <ExternalLink className="h-4 w-4" />
              </a>
              <a
                href="https://deepwiki.com/elsa-workflows/elsa-core"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 text-lg font-medium rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                DeepWiki AI
                <ExternalLink className="h-4 w-4" />
              </a>
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-lg font-medium">Theme</span>
                <ThemeToggle />
              </div>
              {!loading && (
                <>
                  {user ? (
                    <>
                      <Link
                        to="/dashboard"
                        onClick={() => setOpen(false)}
                        className="px-4 py-3 text-lg font-medium rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
                      >
                        <User className="h-4 w-4" />
                        Dashboard
                      </Link>
                      <button
                        onClick={() => {
                          signOut();
                          setOpen(false);
                        }}
                        className="px-4 py-3 text-lg font-medium rounded-lg hover:bg-muted transition-colors flex items-center gap-2 text-left"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/login"
                      onClick={() => setOpen(false)}
                      className="px-4 py-3 text-lg font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-center"
                    >
                      Sign in
                    </Link>
                  )}
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
