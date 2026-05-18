import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Sparkles, MessageCircleQuestion, Wrench, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  onPick: (text: string) => void;
}

type Category = "general" | "dashboard" | "rb";
const CATEGORY_STORAGE_KEY = "weaver:suggestions-category";

type Suggestion = { icon: React.ComponentType<{ className?: string }>; text: string };

const RB_POOL: Suggestion[] = [
  { icon: Wrench, text: "Add the Identity package and turn on OpenIddict." },
  { icon: Sparkles, text: "Auto-fill any missing infrastructure for me." },
  { icon: MessageCircleQuestion, text: "Validate my current build and explain any issues." },
  { icon: Wrench, text: "Enable persistence with Entity Framework Core and SQLite." },
  { icon: Wrench, text: "Add the HTTP activities package and wire up endpoints." },
  { icon: Wrench, text: "Turn on the workflow designer studio." },
  { icon: Sparkles, text: "Configure Hangfire as the background task runner." },
  { icon: Wrench, text: "Set up MassTransit with RabbitMQ for distributed workflows." },
  { icon: MessageCircleQuestion, text: "What's missing for a production-ready build?" },
  { icon: Wrench, text: "Add JavaScript and Liquid expression evaluators." },
  { icon: Sparkles, text: "Switch storage from SQLite to PostgreSQL." },
  { icon: Wrench, text: "Enable the Quartz scheduler for timer activities." },
  { icon: MessageCircleQuestion, text: "Explain what each package I've added actually does." },
  { icon: Wrench, text: "Add file storage support backed by the local filesystem." },
  { icon: Sparkles, text: "Generate a minimal Program.cs for what I've selected." },
  { icon: Wrench, text: "Add CORS so my designer can call the runtime." },
  { icon: MessageCircleQuestion, text: "Which packages are required vs optional in my setup?" },
  { icon: Wrench, text: "Enable workflow versioning and publishing." },
];

const DASHBOARD_POOL: Suggestion[] = [
  { icon: BarChart3, text: "How many credits does my organization have left?" },
  { icon: MessageCircleQuestion, text: "Show my last 5 orders." },
  { icon: Sparkles, text: "Walk me through inviting a teammate." },
  { icon: BarChart3, text: "Summarize my credit consumption this month." },
  { icon: MessageCircleQuestion, text: "When do my current credits expire?" },
  { icon: Sparkles, text: "How do I book an introductory call?" },
  { icon: BarChart3, text: "Show recent work history logged against my org." },
  { icon: MessageCircleQuestion, text: "What's the difference between Standard and Advisory credits?" },
  { icon: Sparkles, text: "How do I purchase another credit bundle?" },
  { icon: BarChart3, text: "List my active subscriptions and renewal dates." },
  { icon: MessageCircleQuestion, text: "How do I update my organization's billing details?" },
  { icon: Sparkles, text: "Open a thread with my service provider." },
  { icon: MessageCircleQuestion, text: "Which teammates have access to my organization?" },
  { icon: BarChart3, text: "Show invoices from the last 90 days." },
  { icon: Sparkles, text: "How do I change my organization's display name?" },
  { icon: MessageCircleQuestion, text: "What counts as urgent support and how is it billed?" },
];

const GENERAL_POOL: Suggestion[] = [
  { icon: MessageCircleQuestion, text: "What's the difference between Elsa Workflows and Elsa+?" },
  { icon: Wrench, text: "Show me the active credit bundles for Valence Works." },
  { icon: Sparkles, text: "How do I get started with Elsa Server in Docker?" },
  { icon: MessageCircleQuestion, text: "What is Elsa Workflows in one paragraph?" },
  { icon: Wrench, text: "Walk me through building my first workflow." },
  { icon: Sparkles, text: "What can the Runtime Builder do for me?" },
  { icon: MessageCircleQuestion, text: "Which database engines does Elsa support?" },
  { icon: Wrench, text: "How do I host the Elsa designer alongside my API?" },
  { icon: Sparkles, text: "What activities ship out of the box?" },
  { icon: MessageCircleQuestion, text: "How does Elsa handle long-running and suspended workflows?" },
  { icon: Wrench, text: "Show me how to trigger a workflow from an HTTP request." },
  { icon: Sparkles, text: "How do I write a custom activity?" },
  { icon: MessageCircleQuestion, text: "What's included in Expert Services?" },
  { icon: Wrench, text: "How do I book a 30-minute intro call?" },
  { icon: Sparkles, text: "What does Managed Cloud Hosting cover?" },
  { icon: MessageCircleQuestion, text: "How do organizations and service providers differ on the platform?" },
];

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Pick 3 suggestions from `pool`, avoiding any text the user has already
 * been shown for `poolKey`. The "seen" set is persisted to localStorage and
 * only resets once the pool is exhausted, so users won't see repeats until
 * they've cycled through all 50.
 */
function pickFreshThree(pool: Suggestion[], poolKey: string): Suggestion[] {
  const storageKey = `weaver:suggestions-seen:${poolKey}`;
  let seen: string[] = [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) seen = JSON.parse(raw);
  } catch {
    seen = [];
  }
  const seenSet = new Set(seen);
  let remaining = pool.filter((s) => !seenSet.has(s.text));
  // Pool exhausted (or too few left to fill 3): start a fresh cycle.
  if (remaining.length < 3) {
    seen = [];
    remaining = pool;
  }
  const picks = shuffle(remaining).slice(0, 3);
  const updated = [...seen, ...picks.map((p) => p.text)];
  try {
    localStorage.setItem(storageKey, JSON.stringify(updated));
  } catch {
    /* storage full or disabled — repeats are acceptable */
  }
  return picks;
}

export function WeaverEmptyState({ onPick }: Props) {
  const { pathname } = useLocation();
  const inRb = pathname.startsWith("/elsa-plus/runtime-builder");
  const inDashboard = pathname.startsWith("/dashboard");
  const defaultCategory: Category = inRb ? "rb" : inDashboard ? "dashboard" : "general";

  const [category, setCategory] = useState<Category>(() => {
    try {
      const saved = localStorage.getItem(CATEGORY_STORAGE_KEY) as Category | null;
      if (saved === "general" || saved === "dashboard" || saved === "rb") return saved;
    } catch {
      /* ignore */
    }
    return defaultCategory;
  });

  const setAndPersist = (next: Category) => {
    setCategory(next);
    try {
      localStorage.setItem(CATEGORY_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const suggestions = useMemo(() => {
    const { pool, key } =
      category === "rb"
        ? { pool: RB_POOL, key: "rb" }
        : category === "dashboard"
          ? { pool: DASHBOARD_POOL, key: "dashboard" }
          : { pool: GENERAL_POOL, key: "general" };
    return pickFreshThree(pool, key);
  }, [category]);

  const CATEGORIES: { id: Category; label: string }[] = [
    { id: "general", label: "General" },
    { id: "dashboard", label: "Dashboard" },
    { id: "rb", label: "Runtime Builder" },
  ];

  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="size-6" />
      </div>
      <div>
        <h3 className="text-base font-semibold">Elsa Weaver</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask about Elsa, the dashboard, or the Runtime Builder. I'll act on what I can and confirm before changing anything.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Suggestion category"
        className="inline-flex rounded-md border bg-muted/30 p-0.5"
      >
        {CATEGORIES.map((c) => {
          const active = category === c.id;
          return (
            <button
              key={c.id}
              role="tab"
              aria-selected={active}
              onClick={() => setAndPersist(c.id)}
              className={cn(
                "rounded-sm px-2.5 py-1 text-xs transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="flex w-full flex-col gap-2">
        {suggestions.map((s) => (
          <Button
            key={s.text}
            variant="outline"
            size="sm"
            className="h-auto justify-start whitespace-normal py-2 text-left"
            onClick={() => onPick(s.text)}
          >
            <s.icon className="size-4 shrink-0 text-muted-foreground" />
            <span className="text-xs">{s.text}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
