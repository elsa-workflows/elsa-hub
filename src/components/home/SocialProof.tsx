import { useEffect, useState } from "react";
import { Github, Package, Users, MessageCircle } from "lucide-react";

type Stat = {
  icon: typeof Github;
  label: string;
  value: string;
  href: string;
};

function formatCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

export function SocialProof() {
  const [stars, setStars] = useState<number | null>(null);
  const [contributors, setContributors] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const repo = await fetch("https://api.github.com/repos/elsa-workflows/elsa-core", {
          headers: { Accept: "application/vnd.github+json" },
        });
        if (repo.ok) {
          const json = await repo.json();
          if (!cancelled && typeof json.stargazers_count === "number") {
            setStars(json.stargazers_count);
          }
        }
      } catch {
        /* offline / rate-limited — keep fallback */
      }

      try {
        // GitHub returns Link header with last page = contributor count
        const res = await fetch(
          "https://api.github.com/repos/elsa-workflows/elsa-core/contributors?per_page=1&anon=true",
          { headers: { Accept: "application/vnd.github+json" } },
        );
        if (res.ok) {
          const link = res.headers.get("Link") ?? "";
          const match = link.match(/&page=(\d+)>; rel="last"/);
          if (match && !cancelled) {
            setContributors(parseInt(match[1], 10));
          }
        }
      } catch {
        /* keep fallback */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const stats: Stat[] = [
    {
      icon: Github,
      label: "GitHub stars",
      value: stars !== null ? formatCompact(stars) : "—",
      href: "https://github.com/elsa-workflows/elsa-core",
    },
    {
      icon: Users,
      label: "Contributors",
      value: contributors !== null ? `${contributors}+` : "—",
      href: "https://github.com/elsa-workflows/elsa-core/graphs/contributors",
    },
    {
      icon: Package,
      label: "NuGet packages",
      value: "60+",
      href: "https://www.nuget.org/profiles/phalanx",
    },
    {
      icon: MessageCircle,
      label: "Discord community",
      value: "Active",
      href: "https://discord.gg/hhChk5H472",
    },
  ];

  return (
    <section className="border-y border-border bg-surface-subtle/40">
      <div className="container py-8 md:py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {stats.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-background transition-colors"
            >
              <div className="h-9 w-9 rounded-md border border-border bg-background flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/40 transition-colors">
                <s.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-semibold tabular-nums leading-tight">{s.value}</div>
                <div className="text-xs text-muted-foreground truncate">{s.label}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
