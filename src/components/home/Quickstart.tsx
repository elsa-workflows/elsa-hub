import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Copy, Terminal, Container, ArrowRight, BookOpen, Server, Layers, Layout as LayoutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";


interface CommandCardProps {
  icon: typeof Terminal;
  label: string;
  command: string;
  helper: string;
  href: string;
  hrefLabel: string;
}

function CommandCard({ icon: Icon, label, command, helper, href, hrefLabel }: CommandCardProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      track("code_copy", { location: "home_quickstart", label });
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* no-op */
    }
  };

  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface-subtle/60">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="relative group">
          <pre className="text-xs md:text-sm bg-muted/60 border border-border rounded-lg px-3 py-2.5 pr-11 overflow-x-auto font-mono leading-relaxed">
            <code>{command}</code>
          </pre>
          <button
            type="button"
            onClick={onCopy}
            aria-label={copied ? "Copied" : "Copy command"}
            className="absolute right-1.5 top-1.5 inline-flex items-center justify-center h-7 w-7 rounded-md border border-border bg-background text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{helper}</p>
        <Link
          to={href}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-2 transition-all"
        >
          {hrefLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

export function Quickstart() {
  return (
    <section id="quickstart" className="py-20 md:py-24 scroll-mt-20">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
            <Terminal className="h-3 w-3" />
            Quickstart
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Run Elsa in under a minute
          </h2>
          <p className="text-muted-foreground">
            Pick the path that fits your stack. Both land you at a running workflow engine
            with the visual designer.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
          <div className="rounded-xl border border-border bg-background overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface-subtle/60">
              <Terminal className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Build with .NET</span>
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <p className="text-sm text-muted-foreground mb-4">
                Add Elsa to your own ASP.NET Core project. Pick the setup that matches your
                architecture — engine only, designer only, or both together.
              </p>
              <ul className="space-y-2 mb-4">
                <li>
                  <Link
                    to="/get-started/elsa-server-and-studio"
                    className="group flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    <Layers className="h-4 w-4 text-primary" />
                    Elsa Server + Studio
                    <span className="text-xs font-normal text-muted-foreground">Recommended</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
                <li>
                  <Link
                    to="/get-started/elsa-server"
                    className="group flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    <Server className="h-4 w-4 text-primary" />
                    Elsa Server only
                    <ArrowRight className="h-3.5 w-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
                <li>
                  <Link
                    to="/get-started/elsa-studio"
                    className="group flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    <LayoutIcon className="h-4 w-4 text-primary" />
                    Elsa Studio only
                    <ArrowRight className="h-3.5 w-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              </ul>
              <p className="mt-auto text-xs text-muted-foreground">
                A <code className="font-mono text-[0.7rem] px-1 py-0.5 rounded bg-muted/60 border border-border">dotnet new</code> project
                template is on the way — until then, follow the guide that fits.
              </p>
            </div>
          </div>
          <CommandCard
            icon={Container}
            label="Docker"
            command="docker run -it -p 8080:8080 elsaworkflows/elsa-server-and-studio:latest"
            helper="Spin up Elsa Server and Studio in one container — no .NET install required."
            href="/get-started/docker"
            hrefLabel="Docker guide"
          />
        </div>


        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm">
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <Link to="/get-started">
              See all paths
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="gap-2" asChild>
            <a href="https://docs.elsaworkflows.io/" target="_blank" rel="noopener noreferrer">
              <BookOpen className="h-3.5 w-3.5" />
              Read the docs
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
