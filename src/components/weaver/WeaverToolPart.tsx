// Renders an AI SDK tool part. For simple read tools we show the AI Elements
// Tool accordion. For "intent" tools (navigate / rb.*) we show an inline
// approval card so the user explicitly opts in to write actions.

import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Check, ExternalLink, Loader2, RotateCw, X, Package, Puzzle, Settings2, Server, PlayCircle, Wand2, FileArchive, Container } from "lucide-react";
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
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [highlighted, setHighlighted] = useState<number | null>(null);

  const focusCitation = (index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
    setHighlighted(index);
    const el = sourceRefs.current[index];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    window.setTimeout(() => {
      setHighlighted((cur) => (cur === index ? null : cur));
    }, 1400);
  };

  const toggleExpanded = (index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
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
        <div className="mt-2 border-t border-border/60 pt-2">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Sources
          </div>
          <ul className="space-y-0.5">
            {allCitations.map((c, i) => {
              const isOpen = expanded.has(i);
              const isHi = highlighted === i;
              return (
                <li
                  key={i}
                  ref={(el) => {
                    sourceRefs.current[i] = el;
                  }}
                  className={`rounded px-1 py-0.5 text-xs transition-colors ${
                    isHi ? "bg-primary/15 ring-1 ring-primary/40" : ""
                  }`}
                >
                  <div className="flex items-baseline gap-1.5">
                    <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">
                      [{i + 1}]
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleExpanded(i)}
                      className="min-w-0 flex-1 truncate text-left text-primary hover:underline"
                    >
                      {c.title}
                    </button>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                      aria-label="Open source in new tab"
                    >
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                  {isOpen ? (
                    <div className="mt-0.5 pl-6 text-[10px] break-all text-muted-foreground">
                      {c.url}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

