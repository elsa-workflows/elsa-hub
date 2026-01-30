import { Link } from "react-router-dom";
import { Github, MessageCircle, BookOpen, ExternalLink } from "lucide-react";
import elsaLogo from "@/assets/elsa-logo.png";
import { FooterNewsletterSignup } from "@/components/newsletter";

const footerLinks = {
  product: [{
    label: "Home",
    to: "/"
  }, {
    label: "Get Started",
    to: "/get-started"
  }, {
    label: "Enterprise",
    to: "/enterprise"
  }, {
    label: "Resources",
    to: "/resources"
  }],
  resources: [{
    label: "Documentation",
    href: "https://v3.elsaworkflows.io/",
    external: true
  }, {
    label: "GitHub",
    href: "https://github.com/elsa-workflows/elsa-core",
    external: true
  }, {
    label: "Discord",
    href: "https://discord.gg/hhChk5H472",
    external: true
  }, {
    label: "NuGet Packages",
    href: "https://www.nuget.org/profiles/phalanx",
    external: true
  }],
  community: [{
    label: "Contributing",
    href: "https://github.com/elsa-workflows/elsa-core/blob/main/CONTRIBUTING.md",
    external: true
  }, {
    label: "Discussions",
    href: "https://github.com/elsa-workflows/elsa-core/discussions",
    external: true
  }, {
    label: "Issues",
    href: "https://github.com/elsa-workflows/elsa-core/issues",
    external: true
  }]
};
export function Footer() {
  return <footer className="bg-surface-subtle rounded-t-[2.5rem] md:rounded-t-[4rem] mt-8">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <img src={elsaLogo} alt="Elsa Workflows" className="h-8 w-8" />
              <span className="text-lg font-semibold">Elsa Workflows</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A powerful .NET workflow engine for building workflow-driven applications.
            </p>
            <div className="flex gap-4 mt-6">
              <a href="https://github.com/elsa-workflows/elsa-core" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" aria-label="GitHub">
                <Github className="h-5 w-5" />
              </a>
              <a href="https://discord.gg/hhChk5H472" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" aria-label="Discord">
                <MessageCircle className="h-5 w-5" />
              </a>
              <a href="https://v3.elsaworkflows.io/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" aria-label="Documentation">
                <BookOpen className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map(link => <li key={link.to}>
                  <Link to={link.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>)}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map(link => <li key={link.href}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
                    {link.label}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>)}
            </ul>
          </div>

          {/* Community Links */}
          <div>
            <h4 className="font-semibold mb-4">Community</h4>
            <ul className="space-y-3">
              {footerLinks.community.map(link => <li key={link.href}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
                    {link.label}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>)}
            </ul>
          </div>

          {/* Newsletter Signup */}
          <div>
            <FooterNewsletterSignup />
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Elsa Workflows. Open source under MIT License.
          </p>
          
        </div>
      </div>
    </footer>;
}