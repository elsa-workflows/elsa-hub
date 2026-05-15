import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Strategy } from "@/lib/runtime-builder/types-v2";

const LABELS: Record<Strategy, string> = {
  "compose-sidecar": "Compose",
  "external-service": "External",
  managed: "Managed",
  none: "None",
};

const TONES: Record<Strategy, string> = {
  "compose-sidecar": "border-emerald-500/40 text-emerald-300",
  "external-service": "border-sky-500/40 text-sky-300",
  managed: "border-primary/40 text-primary",
  none: "border-muted/60 text-muted-foreground",
};

export function StrategyBadge({ strategy, className }: { strategy: Strategy; className?: string }) {
  return (
    <Badge variant="outline" className={cn("text-[10px]", TONES[strategy], className)}>
      {LABELS[strategy]}
    </Badge>
  );
}
