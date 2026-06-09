import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Workflow,
  Puzzle,
  Eye,
  Lock,
  Sparkles,
  Rocket,
  Layers,
  Gauge,
  Wrench,
  Github,
  MessageCircle,
  ExternalLink,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { toast } from "sonner";

const ROADMAP_ISSUE_URL = "https://github.com/elsa-workflows/elsa-core/issues/3232";

type Status = "shipped" | "in-progress" | "planned";
type IconKey = "shield" | "workflow" | "puzzle" | "eye" | "lock" | "sparkles" | "rocket" | "layers" | "gauge" | "wrench";

interface RoadmapItem {
  title: string;
  status: Status;
  detail?: string;
}

interface Theme {
  title: string;
  goal: string;
  icon: IconKey;
  items: RoadmapItem[];
  outcome: string;
}

interface SequencingSlot {
  title: string;
  items: string[];
}

interface ParsedRoadmap {
  themes: Theme[];
  sequencing?: SequencingSlot[];
}

interface Snapshot {
  raw_markdown: string;
  parsed_json: ParsedRoadmap | null;
  parse_status: "structured" | "raw";
  synced_at: string;
  issue_updated_at: string | null;
}

const ICONS: Record<IconKey, LucideIcon> = {
  shield: Shield,
  workflow: Workflow,
  puzzle: Puzzle,
  eye: Eye,
  lock: Lock,
  sparkles: Sparkles,
  rocket: Rocket,
  layers: Layers,
  gauge: Gauge,
  wrench: Wrench,
};

function StatusChip({ status }: { status: Status }) {
  const label = status === "shipped" ? "Shipped" : status === "in-progress" ? "In progress" : "Planned";
  const cls =
    status === "shipped"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : status === "in-progress"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "border-border bg-muted/40 text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider shrink-0",
        cls,
      )}
    >
      {label}
    </span>
  );
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "—";
  }
}

export default function Roadmap() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { data: isAdmin } = useIsAdmin();

  const fetchSnapshot = async () => {
    const { data } = await supabase
      .from("roadmap_snapshots")
      .select("raw_markdown, parsed_json, parse_status, synced_at, issue_updated_at")
      .order("synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSnapshot((data as unknown as Snapshot) ?? null);
    setLoading(false);
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("sync-roadmap", {
        body: { trigger: "manual" },
      });
      if (error) throw error;
      toast.success("Roadmap synced");
      await fetchSnapshot();
    } catch (e) {
      console.error(e);
      toast.error("Failed to sync roadmap");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("roadmap_snapshots")
        .select("raw_markdown, parsed_json, parse_status, synced_at, issue_updated_at")
        .order("synced_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) {
        setSnapshot((data as unknown as Snapshot) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Elsa Workflows Roadmap",
      url: "https://www.elsa-workflows.io/roadmap",
      description:
        "Live roadmap for the Elsa Workflows engine, Studio, and extensions, synced weekly from the maintainers' GitHub roadmap issue.",
    },
  ];

  const parsed = snapshot?.parse_status === "structured" ? snapshot.parsed_json : null;
  const themes = parsed?.themes ?? [];
  const sequencing = parsed?.sequencing ?? [];
  const lastSynced = formatDate(snapshot?.synced_at);

  return (
    <Layout>
      <Seo
        path="/roadmap"
        title="Roadmap — Elsa Workflows"
        description="Live roadmap for Elsa Workflows, synced weekly from GitHub issue #3232."
        jsonLd={jsonLd}
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 -z-10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -z-10" />

        <div className="container py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              {loading ? "Syncing…" : `Last synced ${lastSynced}`}
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">Roadmap</h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8">
              Synced weekly from the maintainers' roadmap on GitHub (issue #3232). A product direction
              document — not a fixed release calendar. Sequencing shifts with real-world demand.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="gap-2" asChild>
                <a href={ROADMAP_ISSUE_URL} target="_blank" rel="noopener noreferrer">
                  <Github className="h-4 w-4" />
                  View source on GitHub
                  <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="gap-2" asChild>
                <a href="https://discord.gg/hhChk5H472" target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  Join the community
                </a>
              </Button>
              {isAdmin && (
                <Button
                  size="lg"
                  variant="secondary"
                  className="gap-2"
                  onClick={handleSyncNow}
                  disabled={syncing}
                >
                  <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
                  {syncing ? "Syncing…" : "Sync roadmap now"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Status legend (only when we have structured themes) */}
      {parsed && themes.length > 0 && (
        <section className="pb-8 md:pb-12">
          <div className="container max-w-6xl">
            <ScrollReveal>
              <Card variant="glass">
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">Status legend</h2>
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 text-sm">
                    <div className="flex items-center gap-3">
                      <StatusChip status="shipped" />
                      <span className="text-muted-foreground">Live in a released package</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusChip status="in-progress" />
                      <span className="text-muted-foreground">Active work or partial productization</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusChip status="planned" />
                      <span className="text-muted-foreground">Roadmap candidate, not yet started</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* Structured themes */}
      {parsed && themes.length > 0 && (
        <section className="py-12 md:py-16 bg-surface-subtle">
          <div className="container max-w-6xl">
            <ScrollReveal>
              <div className="max-w-2xl mb-10">
                <h2 className="text-3xl md:text-4xl font-bold mb-3">Themes</h2>
                <p className="text-muted-foreground text-lg">
                  Tracks the maintainers organize work around. Auto-extracted from{" "}
                  <a href={ROADMAP_ISSUE_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    issue #3232
                  </a>
                  .
                </p>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {themes.map((theme, idx) => {
                const Icon = ICONS[theme.icon] ?? Workflow;
                return (
                  <ScrollReveal key={`${theme.title}-${idx}`} delay={idx * 80}>
                    <Card variant="glass" className="h-full">
                      <CardContent className="p-6 md:p-8 flex flex-col h-full">
                        <div className="flex items-start gap-4 mb-5">
                          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xl font-semibold mb-1">{theme.title}</h3>
                            {theme.goal && <p className="text-sm text-muted-foreground">{theme.goal}</p>}
                          </div>
                        </div>

                        <ul className="space-y-3 flex-1">
                          {theme.items?.map((item, i) => (
                            <li
                              key={`${item.title}-${i}`}
                              className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2.5"
                            >
                              <StatusChip status={item.status} />
                              <div className="min-w-0">
                                <p className="text-sm leading-snug">{item.title}</p>
                                {item.detail && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>

                        {theme.outcome && (
                          <p className="text-xs text-muted-foreground mt-5 pt-4 border-t border-border/60">
                            <span className="font-medium text-foreground">Why it matters — </span>
                            {theme.outcome}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Sequencing */}
      {parsed && sequencing.length > 0 && (
        <section className="py-16 md:py-20">
          <div className="container max-w-6xl">
            <ScrollReveal>
              <div className="max-w-2xl mb-10">
                <h2 className="text-3xl md:text-4xl font-bold mb-3">Recommended sequencing</h2>
                <p className="text-muted-foreground text-lg">
                  Indicative order, not a release commitment.
                </p>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {sequencing.map((slot, idx) => (
                <ScrollReveal key={slot.title} delay={idx * 100}>
                  <Card variant="glass" className="h-full">
                    <CardContent className="p-6 md:p-8">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-semibold">
                          {idx + 1}
                        </span>
                        <h3 className="text-lg font-semibold">{slot.title}</h3>
                      </div>
                      <ul className="space-y-2.5 text-sm text-muted-foreground">
                        {slot.items?.map((item, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Raw markdown fallback */}
      {!loading && (!parsed || themes.length === 0) && snapshot?.raw_markdown && (
        <section className="py-12 md:py-16 bg-surface-subtle">
          <div className="container max-w-4xl">
            <ScrollReveal>
              <Card variant="glass">
                <CardContent className="p-6 md:p-10">
                  <div className="mb-6 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Source view — structured parse unavailable
                  </div>
                  <article className="prose prose-sm md:prose-base max-w-none dark:prose-invert prose-headings:tracking-tight prose-a:text-primary">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{snapshot.raw_markdown}</ReactMarkdown>
                  </article>
                </CardContent>
              </Card>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* Loading / empty state */}
      {loading && (
        <section className="py-20">
          <div className="container max-w-4xl text-center text-muted-foreground">Loading roadmap…</div>
        </section>
      )}

      {!loading && !snapshot && (
        <section className="py-20">
          <div className="container max-w-4xl text-center text-muted-foreground">
            The roadmap hasn't synced yet.{" "}
            <a href={ROADMAP_ISSUE_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              View it on GitHub →
            </a>
          </div>
        </section>
      )}
    </Layout>
  );
}
