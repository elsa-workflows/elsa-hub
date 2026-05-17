// Renders an AI SDK tool part. For simple read tools we show the AI Elements
// Tool accordion. For "intent" tools (navigate / rb.*) we show an inline
// approval card so the user explicitly opts in to write actions.

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, ExternalLink, X, Package, Puzzle, Settings2, Server, PlayCircle, Wand2, FileArchive } from "lucide-react";
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

  // DeepWiki MCP answer (deepwikiAsk tool) — not an "intent", a real result.
  if (
    !intent &&
    output &&
    typeof output === "object" &&
    typeof (output as any).answer === "string" &&
    typeof (output as any).fallbackUrl === "string"
  ) {
    return <DeepWikiAnswerCard data={output as DeepWikiAnswerData} />;
  }

  if (intent && intent.kind === "deepwiki") {
    return (
      <div className="my-2 flex items-center justify-between gap-3 rounded-md border bg-muted/40 p-3 text-sm">
        <div className="min-w-0">
          <div className="font-medium">{intent.label}</div>
          <div className="truncate text-xs text-muted-foreground">{intent.reason}</div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            DeepWiki · {intent.repo}
          </div>
        </div>
        <Button size="sm" variant="secondary" asChild>
          <a href={intent.url} target="_blank" rel="noopener noreferrer">
            Open <ExternalLink className="size-3" />
          </a>
        </Button>
      </div>
    );
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
