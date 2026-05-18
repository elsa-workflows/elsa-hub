// Renders an AI SDK tool part. For simple read tools we show the AI Elements
// Tool accordion. For "intent" tools (navigate / rb.*) we show an inline
// approval card so the user explicitly opts in to write actions.

import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Check, Copy, ExternalLink, Lightbulb, Loader2, RotateCw, SearchX, X, Package, Puzzle, Settings2, Server, PlayCircle, Wand2, FileArchive, Container } from "lucide-react";
import { findBuilderImage } from "@/lib/runtime-builder/images";
import { useRuntimeBuilder } from "@/lib/runtime-builder/store";
import type { CatalogV2 } from "@/lib/runtime-builder/types-v2";
import type { ToolUIPart, DynamicToolUIPart } from "ai";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useCatalogQuery } from "@/lib/runtime-builder/catalog-client";
import { applyRbIntent } from "@/lib/weaver/runtime-builder-bridge";
import { isWeaverIntent, type WeaverIntent } from "@/lib/weaver/intents";
import { toast } from "sonner";

type AnyToolPart = ToolUIPart | DynamicToolUIPart;

export function WeaverToolPart({ part }: { part: AnyToolPart }) {
  const navigate = useNavigate();

  // Extract tool name from part type "tool-<name>" or dynamic-tool
  const toolName =
    part.type === "dynamic-tool"
      ? (part as DynamicToolUIPart).toolName
      : part.type.replace(/^tool-/, "");

  const output =
    "output" in part && part.state === "output-available" ? part.output : null;
  const intent = isWeaverIntent(output) ? (output as WeaverIntent) : null;

  // DeepWiki MCP answer (deepwikiAsk tool) — render loading, error and
  // success states with a retry affordance when the lookup fails.
  if (toolName === "deepwikiAsk") {
    const input = ("input" in part ? (part.input as { question?: string; repo?: string } | undefined) : undefined) ?? undefined;
    const question = input?.question;
    const repo = input?.repo;

    if (part.state === "input-streaming" || part.state === "input-available") {
      return <DeepWikiLoadingCard question={question} repo={repo} />;
    }
    if (part.state === "output-error") {
      return (
        <DeepWikiErrorCard
          question={question}
          repo={repo}
          message={part.errorText ?? "DeepWiki lookup failed."}
        />
      );
    }
    if (output && typeof output === "object") {
      const data = output as DeepWikiAnswerData;
      if (data.error && question) {
        return (
          <DeepWikiErrorCard
            question={question}
            repo={repo ?? data.repo}
            message={data.error}
            fallbackUrl={data.fallbackUrl}
          />
        );
      }
      if (typeof data.answer === "string" && typeof data.fallbackUrl === "string") {
        if (isEmptyDeepWikiAnswer(data)) {
          return (
            <DeepWikiEmptyCard
              question={question}
              repo={repo ?? data.repo}
              fallbackUrl={data.fallbackUrl}
              answer={data.answer}
            />
          );
        }
        return <DeepWikiAnswerCard data={data} />;
      }
    }
  }

  // Render an inline confirmation card for action intents
  if (intent && intent.kind !== "navigate") {
    return <RbApprovalCard intent={intent} toolName={toolName} />;
  }
  if (intent && intent.kind === "navigate") {
    return (
      <div className="my-2 flex items-center justify-between gap-3 rounded-md border bg-muted/40 p-3 text-sm">
        <div className="min-w-0">
          <div className="font-medium">{intent.label}</div>
          <div className="truncate text-xs text-muted-foreground">{intent.reason}</div>
        </div>
        <Button size="sm" onClick={() => navigate(intent.path)}>
          Open <ArrowRight className="size-3" />
        </Button>
      </div>
    );
  }

  // Default read-tool rendering: collapsed accordion
  return (
    <Tool defaultOpen={false} className="my-2">
      <ToolHeader type={part.type as `tool-${string}`} state={part.state} />
      <ToolContent>
        {"input" in part ? <ToolInput input={part.input} /> : null}
        <ToolOutput
          output={output ? <pre className="text-xs">{JSON.stringify(output, null, 2)}</pre> : null}
          errorText={part.state === "output-error" ? part.errorText : undefined}
        />
      </ToolContent>
    </Tool>
  );
}

function RbApprovalCard({
  intent,
  toolName,
}: {
  intent: WeaverIntent;
  toolName: string;
}) {
  const { data: catalog } = useCatalogQuery();
  const builderState = useRuntimeBuilder((s) => s.state);
  const [applied, setApplied] = useState<null | { ok: boolean; message: string }>(null);

  const summary = describeIntent(intent);
  const checklist = useMemo(
    () => buildChecklist(intent, catalog ?? null, builderState),
    [intent, catalog, builderState],
  );

  const onApply = () => {
    const result = applyRbIntent(intent, catalog ?? null);
    setApplied(result);
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
  };

  if (applied) {
    return (
      <div className="my-2 flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-xs">
        {applied.ok ? (
          <Check className="size-4 text-emerald-500" />
        ) : (
          <X className="size-4 text-destructive" />
        )}
        <span>{applied.message}</span>
      </div>
    );
  }

  const Icon = summary.icon;
  const noChanges = checklist.length === 1 && checklist[0].noop;

  return (
    <div className="my-2 rounded-md border bg-muted/40 p-3 text-sm">
      <div className="mb-3 flex items-start gap-2">
        <Icon className="mt-0.5 size-4 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="font-medium">{summary.title}</div>
          <div className="text-xs text-muted-foreground">{summary.detail}</div>
        </div>
      </div>

      <div className="mb-3 rounded border border-border/60 bg-background/60 p-2">
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Review changes before confirming
        </div>
        <ul className="space-y-1">
          {checklist.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs">
              <span
                className={
                  "mt-0.5 inline-block size-1.5 shrink-0 rounded-full " +
                  (item.noop
                    ? "bg-muted-foreground/40"
                    : item.tone === "remove"
                      ? "bg-destructive"
                      : item.tone === "warn"
                        ? "bg-amber-500"
                        : "bg-emerald-500")
                }
              />
              <span className="flex-1">
                <span className="font-medium">{item.label}</span>
                {item.from || item.to ? (
                  <span className="ml-1 text-muted-foreground">
                    {item.from ? <code className="rounded bg-muted px-1">{item.from}</code> : null}
                    {item.from && item.to ? <span className="mx-1">→</span> : null}
                    {item.to ? <code className="rounded bg-muted px-1">{item.to}</code> : null}
                  </span>
                ) : null}
                {item.detail ? (
                  <span className="ml-1 text-muted-foreground">{item.detail}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setApplied({ ok: false, message: "Cancelled." })}
        >
          Cancel
        </Button>
        <Button size="sm" onClick={onApply} disabled={noChanges}>
          {noChanges ? "Nothing to apply" : "Confirm"}
        </Button>
      </div>
      <div className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
        Tool: {toolName}
      </div>
    </div>
  );
}

interface ChecklistItem {
  label: string;
  detail?: string;
  from?: string;
  to?: string;
  tone?: "add" | "remove" | "warn" | "info";
  noop?: boolean;
}

function buildChecklist(
  intent: WeaverIntent,
  catalog: CatalogV2 | null,
  state: ReturnType<typeof useRuntimeBuilder.getState>["state"],
): ChecklistItem[] {
  switch (intent.kind) {
    case "rb.addPackage": {
      const already = state.selectedPackages.some((p) => p.packageId === intent.packageId);
      if (already)
        return [{ label: `Package ${intent.packageId} already in build`, noop: true }];
      const pkg = catalog?.packages.find((p) => p.id === intent.packageId);
      const version = pkg?.version ?? pkg?.versions?.[0] ?? "latest";
      return [
        {
          label: "Add package",
          to: `${intent.packageId}@${version}`,
          tone: "add",
        },
        {
          label: "Dependency closure",
          detail: "Any required packages will be auto-added.",
          tone: "info",
        },
      ];
    }
    case "rb.removePackage": {
      const exists = state.selectedPackages.find((p) => p.packageId === intent.packageId);
      if (!exists)
        return [{ label: `${intent.packageId} is not in build`, noop: true }];
      return [
        {
          label: "Remove package",
          from: `${intent.packageId}@${exists.version}`,
          tone: "remove",
        },
      ];
    }
    case "rb.toggleFeature": {
      const sel = state.selectedPackages.find((p) => p.packageId === intent.packageId);
      const isOn = sel?.selectedFeatures.includes(intent.featureId) ?? false;
      if (isOn === intent.enabled)
        return [
          {
            label: `Feature ${intent.featureId} already ${intent.enabled ? "enabled" : "disabled"}`,
            noop: true,
          },
        ];
      const items: ChecklistItem[] = [];
      if (!sel) {
        items.push({
          label: "Add host package",
          to: intent.packageId,
          tone: "add",
          detail: "Required to enable this capability.",
        });
      }
      items.push({
        label: intent.enabled ? "Enable capability" : "Disable capability",
        to: `${intent.packageId} · ${intent.featureId}`,
        tone: intent.enabled ? "add" : "remove",
      });
      return items;
    }
    case "rb.setFeatureSetting": {
      const sel = state.selectedPackages.find((p) => p.packageId === intent.packageId);
      const hasFeature = sel?.selectedFeatures.includes(intent.featureId) ?? false;
      const current = sel?.settings?.[intent.featureId]?.[intent.name];
      const items: ChecklistItem[] = [];
      if (!sel) {
        items.push({
          label: "Add host package",
          to: intent.packageId,
          tone: "add",
          detail: "Will be added so the setting can apply.",
        });
      }
      if (!hasFeature) {
        items.push({
          label: "Enable capability",
          to: intent.featureId,
          tone: "add",
        });
      }
      items.push({
        label: `Setting ${intent.name}`,
        from: current === undefined ? "(unset)" : String(current),
        to: String(intent.value),
        tone: "info",
      });
      return items;
    }
    case "rb.selectInfrastructure": {
      const current = state.infrastructureSelections.find((i) => i.kind === intent.kindOf);
      const provider = catalog?.infrastructureProviders.find((p) => p.id === intent.providerId);
      if (current?.providerId === intent.providerId)
        return [{ label: `${intent.kindOf} already set to ${intent.providerId}`, noop: true }];
      return [
        {
          label: `Infrastructure · ${intent.kindOf}`,
          from: current?.providerId ?? "(none)",
          to: provider?.displayName ?? intent.providerId,
          tone: "info",
        },
      ];
    }
    case "rb.selectImage": {
      const next = findBuilderImage(intent.slug);
      if (!next) {
        return [{ label: `Unknown image: ${intent.slug}`, tone: "warn" }];
      }
      const cur = state.imageSelection;
      const curImg = findBuilderImage(cur.slug);
      const nextTag = intent.tag ?? cur.tag;
      const nextPort = intent.hostPort ?? cur.hostPort;
      const slugChanged = cur.slug !== next.slug;
      const tagChanged = cur.tag !== nextTag;
      const portChanged = cur.hostPort !== nextPort;
      if (!slugChanged && !tagChanged && !portChanged) {
        return [
          {
            label: `${next.name} @ ${nextTag} is already selected`,
            noop: true,
          },
        ];
      }
      const items: ChecklistItem[] = [
        {
          label: "Runtime image",
          from: curImg ? `${curImg.name} @ ${cur.tag}` : `${cur.slug} @ ${cur.tag}`,
          to: `${next.name} @ ${nextTag}`,
          tone: "info",
        },
      ];
      if (portChanged) {
        items.push({
          label: "Host port",
          from: String(cur.hostPort),
          to: String(nextPort),
          tone: "info",
        });
      }
      if (next.requiresServer) {
        items.push({
          label: "Server companion",
          detail: "A Server service will be emitted alongside Studio in the bundle.",
          tone: "warn",
        });
      }
      return items;
    }
    case "rb.autoFillInfrastructure":
      return [
        {
          label: "Auto-fill infrastructure",
          detail: "Picks providers for any unmet infrastructure requirements.",
          tone: "info",
        },
      ];
    case "rb.validate":
      return [{ label: "Run catalog validation against current build", tone: "info" }];
    case "rb.generateBundle":
      return [{ label: "Generate compose + env bundle from current build", tone: "info" }];
    default:
      return [{ label: "Apply action", tone: "info" }];
  }
}

function describeIntent(i: WeaverIntent): {
  title: string;
  detail: string;
  icon: typeof Package;
} {
  switch (i.kind) {
    case "rb.addPackage":
      return {
        title: `Add package ${i.packageId}`,
        detail: i.reason ?? "Adds the package to your build.",
        icon: Package,
      };
    case "rb.removePackage":
      return {
        title: `Remove package ${i.packageId}`,
        detail: "Removes it from the build.",
        icon: Package,
      };
    case "rb.toggleFeature":
      return {
        title: `${i.enabled ? "Enable" : "Disable"} capability ${i.featureId}`,
        detail: `On package ${i.packageId}.`,
        icon: Puzzle,
      };
    case "rb.setFeatureSetting":
      return {
        title: `Set ${i.name}`,
        detail: `On capability ${i.featureId} of ${i.packageId}.`,
        icon: Settings2,
      };
    case "rb.selectInfrastructure":
      return {
        title: `Select ${i.providerId} for ${i.kindOf}`,
        detail: "Updates infrastructure selection.",
        icon: Server,
      };
    case "rb.selectImage": {
      const img = findBuilderImage(i.slug);
      return {
        title: img ? `Use ${img.name}` : `Use image ${i.slug}`,
        detail: i.reason ?? img?.tagline ?? "Updates the runtime image selection.",
        icon: Container,
      };
    }
    case "rb.autoFillInfrastructure":
      return {
        title: "Auto-fill infrastructure",
        detail: "Picks providers for unmet requirements.",
        icon: Wand2,
      };
    case "rb.validate":
      return { title: "Validate current build", detail: "Runs catalog validation.", icon: PlayCircle };
    case "rb.generateBundle":
      return { title: "Generate deployable bundle", detail: "Produces compose + env.", icon: FileArchive };
    default:
      return { title: "Apply action", detail: "", icon: Package };
  }
}

interface DeepWikiAnswerData {
  answer: string;
  citations?: { title: string; url: string }[];
  repo?: string;
  fallbackUrl: string;
  error?: string;
}

type AnswerSegment =
  | { kind: "text"; value: string }
  | { kind: "cite"; index: number; label: string; url: string };

// Walk the answer in one pass, replacing markdown links and bare URLs with
// numbered citation chips. Indices match the order URLs first appear, which
// is the same order extractCitations on the server uses, so chip [n] aligns
// with data.citations[n-1] whenever possible.
function segmentAnswer(
  answer: string,
  citations: { title: string; url: string }[],
): AnswerSegment[] {
  const urlToIndex = new Map<string, number>();
  citations.forEach((c, i) => urlToIndex.set(c.url, i));

  const pattern =
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(?<![\[(])\bhttps?:\/\/[^\s)]+/g;
  const segments: AnswerSegment[] = [];
  let cursor = 0;
  let nextLocalIndex = citations.length;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(answer))) {
    if (m.index > cursor) {
      segments.push({ kind: "text", value: answer.slice(cursor, m.index) });
    }
    const isMd = Boolean(m[2]);
    const url = isMd ? m[2] : m[0];
    const label = isMd ? m[1] : url.replace(/^https?:\/\//, "");
    let idx = urlToIndex.get(url);
    if (idx === undefined) {
      idx = nextLocalIndex++;
      urlToIndex.set(url, idx);
    }
    segments.push({ kind: "cite", index: idx, label, url });
    cursor = m.index + m[0].length;
  }
  if (cursor < answer.length) {
    segments.push({ kind: "text", value: answer.slice(cursor) });
  }
  return segments;
}

function DeepWikiAnswerCard({ data }: { data: DeepWikiAnswerData }) {
  const citations = data.citations ?? [];
  const segments = useMemo(
    () => (data.error ? [] : segmentAnswer(data.answer, citations)),
    [data.answer, data.error, citations],
  );

  // Merge any citations only discovered while segmenting (rare — beyond the
  // server's first 6) so chip indices always resolve to a source entry.
  const allCitations = useMemo(() => {
    const extra: { title: string; url: string }[] = [];
    const seen = new Set(citations.map((c) => c.url));
    for (const s of segments) {
      if (s.kind === "cite" && !seen.has(s.url)) {
        seen.add(s.url);
        extra.push({ title: s.label.slice(0, 120), url: s.url });
      }
    }
    return [...citations, ...extra];
  }, [citations, segments]);

  const sourceRefs = useRef<Array<HTMLLIElement | null>>([]);
  const [highlighted, setHighlighted] = useState<number | null>(null);

  const focusCitation = (index: number) => {
    setHighlighted(index);
    const el = sourceRefs.current[index];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    window.setTimeout(() => {
      setHighlighted((cur) => (cur === index ? null : cur));
    }, 1400);
  };

  return (
    <div className="my-2 rounded-md border bg-muted/40 p-3 text-sm">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          DeepWiki{data.repo ? ` · ${data.repo}` : ""}
        </div>
        <Button size="sm" variant="ghost" asChild className="h-6 px-2 text-xs">
          <a href={data.fallbackUrl} target="_blank" rel="noopener noreferrer">
            Open <ExternalLink className="size-3" />
          </a>
        </Button>
      </div>
      {data.error ? (
        <div className="text-xs text-destructive">
          DeepWiki lookup failed: {data.error}
        </div>
      ) : (
        <div className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">
          {segments.map((seg, i) =>
            seg.kind === "text" ? (
              <span key={i}>{seg.value}</span>
            ) : (
              <button
                key={i}
                type="button"
                onClick={() => focusCitation(seg.index)}
                title={seg.url}
                className="mx-0.5 inline-flex items-baseline gap-0.5 rounded bg-primary/10 px-1 align-baseline text-[10px] font-semibold text-primary hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                <span className="max-w-[18ch] truncate">{seg.label}</span>
                <sup className="text-[9px]">[{seg.index + 1}]</sup>
              </button>
            ),
          )}
        </div>
      )}
      {allCitations.length > 0 ? (
        <div className="mt-3 border-t border-border/60 pt-2">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Sources ({allCitations.length})
            </div>
          </div>
          <ul className="space-y-1.5">
            {allCitations.map((c, i) => {
              const isHi = highlighted === i;
              const parts = parseUrl(c.url);
              return (
                <li
                  key={i}
                  ref={(el) => {
                    sourceRefs.current[i] = el;
                  }}
                  className={`group rounded-md border border-border/60 bg-background/60 px-2 py-1.5 text-xs transition-colors ${
                    isHi ? "ring-1 ring-primary/50 bg-primary/5" : "hover:bg-background"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 rounded bg-muted px-1 text-[10px] font-semibold text-muted-foreground">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate font-medium text-primary hover:underline"
                        title={c.title}
                      >
                        {c.title}
                      </a>
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 flex items-baseline gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                        title={c.url}
                      >
                        {parts.host ? (
                          <span className="shrink-0 font-semibold text-foreground/70">
                            {parts.host}
                          </span>
                        ) : null}
                        <span className="truncate">{parts.path || c.url}</span>
                      </a>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                      <CopyUrlButton url={c.url} />
                      <Button
                        size="icon"
                        variant="ghost"
                        asChild
                        className="size-6"
                        title="Open in new tab"
                      >
                        <a href={c.url} target="_blank" rel="noopener noreferrer" aria-label="Open source in new tab">
                          <ExternalLink className="size-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function DeepWikiHeader({ repo, right }: { repo?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <BookOpen className="size-3" />
        DeepWiki{repo ? ` · ${repo}` : ""}
      </div>
      {right}
    </div>
  );
}

function DeepWikiLoadingCard({ question, repo }: { question?: string; repo?: string }) {
  return (
    <div
      className="my-2 rounded-md border bg-muted/40 p-3 text-sm"
      role="status"
      aria-live="polite"
    >
      <DeepWikiHeader
        repo={repo}
        right={
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            Asking…
          </span>
        }
      />
      {question ? (
        <div className="mb-2 text-xs italic text-muted-foreground">
          “{question}”
        </div>
      ) : null}
      <div className="space-y-1.5">
        <div className="h-2 w-11/12 animate-pulse rounded bg-muted-foreground/20" />
        <div className="h-2 w-10/12 animate-pulse rounded bg-muted-foreground/15" />
        <div className="h-2 w-9/12 animate-pulse rounded bg-muted-foreground/10" />
      </div>
    </div>
  );
}

function dispatchDeepWikiRetry(question: string, repo?: string) {
  const text = repo
    ? `Re-run DeepWiki for ${repo}: ${question}`
    : `Re-run DeepWiki: ${question}`;
  window.dispatchEvent(
    new CustomEvent("weaver:retry", { detail: { text } }),
  );
}

function dispatchDeepWikiAsk(question: string, repo?: string) {
  const text = repo
    ? `Ask DeepWiki about ${repo}: ${question}`
    : `Ask DeepWiki: ${question}`;
  window.dispatchEvent(
    new CustomEvent("weaver:retry", { detail: { text } }),
  );
}

// Build 4 concrete, clickable re-asks from the user's original question.
// We extract a rough "topic" (strip leading question words) and template
// different intents around it (how it works, where it lives, examples,
// architecture). If we can't extract a topic, fall back to generic prompts.
function buildDeepWikiSuggestions(question?: string, repo?: string): string[] {
  const repoLabel = repo ?? "the repo";
  const raw = (question ?? "").trim();
  const topic = raw
    .replace(/[?.!]+$/g, "")
    .replace(
      /^(how|what|where|when|why|who|which|can|could|does|do|is|are|please|tell me about|explain|show me|describe)\b[^a-z0-9]*/i,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();

  if (!topic) {
    return [
      `Give an overview of ${repoLabel}.`,
      `What are the main components of ${repoLabel}?`,
      `Show a minimal "hello world" example for ${repoLabel}.`,
      `What design decisions are unique to ${repoLabel}?`,
    ];
  }

  return [
    `How does ${topic} work in ${repoLabel}?`,
    `Where in ${repoLabel} is ${topic} implemented?`,
    `Show a code example using ${topic} in ${repoLabel}.`,
    `What are common pitfalls or limitations of ${topic}?`,
  ];
}

function DeepWikiErrorCard({
  question,
  repo,
  message,
  fallbackUrl,
}: {
  question?: string;
  repo?: string;
  message: string;
  fallbackUrl?: string;
}) {
  const canRetry = Boolean(question);
  return (
    <div
      className="my-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"
      role="alert"
    >
      <DeepWikiHeader
        repo={repo}
        right={
          <span className="text-[10px] font-semibold uppercase tracking-wide text-destructive">
            Failed
          </span>
        }
      />
      {question ? (
        <div className="mb-2 text-xs italic text-muted-foreground">
          “{question}”
        </div>
      ) : null}
      <div className="text-xs text-destructive">{message}</div>
      <div className="mt-3 flex justify-end gap-2">
        {fallbackUrl ? (
          <Button size="sm" variant="ghost" asChild className="h-7 px-2 text-xs">
            <a href={fallbackUrl} target="_blank" rel="noopener noreferrer">
              Open DeepWiki <ExternalLink className="size-3" />
            </a>
          </Button>
        ) : null}
        {canRetry ? (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => dispatchDeepWikiRetry(question!, repo)}
          >
            <RotateCw className="size-3" />
            Retry
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function parseUrl(url: string): { host: string; path: string } {
  try {
    const u = new URL(url);
    const host = u.host.replace(/^www\./, "");
    const path = `${u.pathname}${u.search}${u.hash}`.replace(/\/$/, "");
    return { host, path };
  } catch {
    return { host: "", path: url };
  }
}

function CopyUrlButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("URL copied");
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("Could not copy URL");
    }
  };
  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={onCopy}
      className="size-6"
      title={copied ? "Copied" : "Copy URL"}
      aria-label="Copy URL"
    >
      {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
    </Button>
  );
}

// Heuristic: detect DeepWiki responses that didn't actually answer the
// question (empty body, very short, or known "I don't know" patterns).
function isEmptyDeepWikiAnswer(data: DeepWikiAnswerData): boolean {
  const raw = (data.answer ?? "").trim();
  if (raw.length === 0) return true;
  // Strip markdown links so URL noise doesn't inflate length.
  const stripped = raw
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1")
    .trim();
  if (stripped.length < 40 && (data.citations?.length ?? 0) === 0) return true;
  const lower = stripped.toLowerCase();
  const noMatchPatterns = [
    "i don't have",
    "i do not have",
    "i couldn't find",
    "i could not find",
    "no information",
    "no relevant",
    "not found in",
    "does not contain",
    "doesn't contain",
    "unable to find",
    "no matches",
    "no results",
    "i'm not able to",
    "i am not able to",
  ];
  return noMatchPatterns.some((p) => lower.includes(p));
}

function DeepWikiSuggestions({
  question,
  repo,
}: {
  question?: string;
  repo?: string;
}) {
  const suggestions = buildDeepWikiSuggestions(question, repo);
  return (
    <div className="mt-3 rounded border border-border/60 bg-background/60 p-2">
      <div className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Lightbulb className="size-3" />
        Try one of these
      </div>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => dispatchDeepWikiAsk(s, repo)}
            className="group inline-flex max-w-full items-center gap-1 rounded-full border border-border/60 bg-background px-2.5 py-1 text-[11px] text-foreground/80 transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-foreground"
          >
            <span className="truncate text-left">{s}</span>
            <ArrowRight className="size-3 shrink-0 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />
          </button>
        ))}
      </div>
    </div>
  );
}

// Curated gallery of high-signal DeepWiki questions, grouped by repo. These
// are written to match the structure of each Elsa repo so users see what
// kinds of questions DeepWiki can actually answer well.
const DEEPWIKI_EXAMPLES: { repo: "elsa-core" | "elsa-studio" | "elsa-extensions"; label: string; blurb: string; questions: string[] }[] = [
  {
    repo: "elsa-core",
    label: "elsa-core",
    blurb: "Runtime, activities, persistence, scheduling",
    questions: [
      "How does WorkflowRuntime dispatch a workflow?",
      "How are activities discovered and registered at startup?",
      "Where is the bookmark resumption logic implemented?",
      "Explain the SendHttpRequest activity end-to-end.",
      "How does the EF Core persistence store handle workflow state?",
      "What does the default scheduling pipeline look like?",
    ],
  },
  {
    repo: "elsa-studio",
    label: "elsa-studio",
    blurb: "Designer, Blazor UI, modules",
    questions: [
      "How is the workflow designer canvas rendered in Studio?",
      "Where are Studio modules registered?",
      "How does the Studio client talk to the Elsa Server API?",
      "How are custom activity descriptors loaded into the toolbox?",
    ],
  },
  {
    repo: "elsa-extensions",
    label: "elsa-extensions",
    blurb: "Identity, integrations, optional packages",
    questions: [
      "How is OpenIddict wired into the Identity package?",
      "What does the MassTransit integration register?",
      "How are AzureServiceBus activities implemented?",
      "Show the structure of the Email package.",
    ],
  },
];

function DeepWikiExamples({ defaultRepo }: { defaultRepo?: string }) {
  const initial = DEEPWIKI_EXAMPLES.findIndex((g) => g.repo === defaultRepo);
  const [activeIdx, setActiveIdx] = useState(initial >= 0 ? initial : 0);
  const active = DEEPWIKI_EXAMPLES[activeIdx];
  return (
    <div className="mt-3 rounded border border-border/60 bg-background/60 p-2">
      <div className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <BookOpen className="size-3" />
        Example questions by repo
      </div>
      <div className="mb-2 flex flex-wrap gap-1">
        {DEEPWIKI_EXAMPLES.map((g, i) => (
          <button
            key={g.repo}
            type="button"
            onClick={() => setActiveIdx(i)}
            className={
              i === activeIdx
                ? "rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground"
                : "rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }
          >
            {g.label}
          </button>
        ))}
      </div>
      <div className="mb-1.5 text-[10px] text-muted-foreground">{active.blurb}</div>
      <div className="flex flex-wrap gap-1.5">
        {active.questions.map((q, i) => (
          <button
            key={i}
            type="button"
            onClick={() => dispatchDeepWikiAsk(q, active.repo)}
            className="group inline-flex max-w-full items-center gap-1 rounded-full border border-border/60 bg-background px-2.5 py-1 text-[11px] text-foreground/80 transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-foreground"
          >
            <span className="truncate text-left">{q}</span>
            <ArrowRight className="size-3 shrink-0 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />
          </button>
        ))}
      </div>
    </div>
  );
}

function DeepWikiEmptyCard({
  question,
  repo,
  fallbackUrl,
  answer,
}: {
  question?: string;
  repo?: string;
  fallbackUrl: string;
  answer: string;
}) {
  return (
    <div className="my-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
      <DeepWikiHeader
        repo={repo}
        right={
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            <SearchX className="size-3" />
            No relevant matches
          </span>
        }
      />
      {question ? (
        <div className="mb-2 text-xs italic text-muted-foreground">
          “{question}”
        </div>
      ) : null}
      <p className="text-xs text-foreground/90">
        DeepWiki didn't find a confident answer for this in
        {repo ? ` ${repo}` : " the repo"}. Try rephrasing with more specifics,
        or browse the wiki directly.
      </p>
      {answer.trim().length > 0 ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
            What DeepWiki returned
          </summary>
          <div className="mt-1 whitespace-pre-wrap rounded bg-background/60 p-2 text-[11px] text-muted-foreground">
            {answer}
          </div>
        </details>
      ) : null}
      <DeepWikiSuggestions question={question} repo={repo} />
      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" variant="ghost" asChild className="h-7 px-2 text-xs">
          <a href={fallbackUrl} target="_blank" rel="noopener noreferrer">
            Browse DeepWiki <ExternalLink className="size-3" />
          </a>
        </Button>
        {question ? (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => dispatchDeepWikiRetry(question, repo)}
          >
            <RotateCw className="size-3" />
            Retry
          </Button>
        ) : null}
      </div>
    </div>
  );
}

