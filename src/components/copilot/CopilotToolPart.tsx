// Renders an AI SDK tool part. For simple read tools we show the AI Elements
// Tool accordion. For "intent" tools (navigate / rb.*) we show an inline
// approval card so the user explicitly opts in to write actions.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, X } from "lucide-react";
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
import { applyRbIntent } from "@/lib/copilot/runtime-builder-bridge";
import { isCopilotIntent, type CopilotIntent } from "@/lib/copilot/intents";
import { toast } from "sonner";

type AnyToolPart = ToolUIPart | DynamicToolUIPart;

export function CopilotToolPart({ part }: { part: AnyToolPart }) {
  const navigate = useNavigate();

  // Extract tool name from part type "tool-<name>" or dynamic-tool
  const toolName =
    part.type === "dynamic-tool"
      ? (part as DynamicToolUIPart).toolName
      : part.type.replace(/^tool-/, "");

  const output =
    "output" in part && part.state === "output-available" ? part.output : null;
  const intent = isCopilotIntent(output) ? (output as CopilotIntent) : null;

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
  intent: CopilotIntent;
  toolName: string;
}) {
  const { data: catalog } = useCatalogQuery();
  const [applied, setApplied] = useState<null | { ok: boolean; message: string }>(null);

  const summary = describeIntent(intent);

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

  return (
    <div className="my-2 rounded-md border bg-muted/40 p-3 text-sm">
      <div className="mb-2">
        <div className="font-medium">{summary.title}</div>
        <div className="text-xs text-muted-foreground">{summary.detail}</div>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setApplied({ ok: false, message: "Cancelled." })}
        >
          Cancel
        </Button>
        <Button size="sm" onClick={onApply}>
          Confirm
        </Button>
      </div>
      <div className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
        Tool: {toolName}
      </div>
    </div>
  );
}

function describeIntent(i: CopilotIntent): { title: string; detail: string } {
  switch (i.kind) {
    case "rb.addPackage":
      return { title: `Add package ${i.packageId}`, detail: i.reason ?? "Adds the package to your build." };
    case "rb.removePackage":
      return { title: `Remove package ${i.packageId}`, detail: "Removes it from the build." };
    case "rb.toggleFeature":
      return {
        title: `${i.enabled ? "Enable" : "Disable"} feature ${i.featureId}`,
        detail: `On package ${i.packageId}.`,
      };
    case "rb.setFeatureSetting":
      return {
        title: `Set ${i.name} = ${String(i.value)}`,
        detail: `On feature ${i.featureId} of ${i.packageId}.`,
      };
    case "rb.selectInfrastructure":
      return {
        title: `Select ${i.providerId} for ${i.kindOf}`,
        detail: "Updates infrastructure selection.",
      };
    case "rb.autoFillInfrastructure":
      return { title: "Auto-fill infrastructure", detail: "Picks providers for unmet requirements." };
    case "rb.validate":
      return { title: "Validate current build", detail: "Runs catalog validation." };
    case "rb.generateBundle":
      return { title: "Generate deployable bundle", detail: "Produces compose + env." };
    default:
      return { title: "Apply action", detail: "" };
  }
}
