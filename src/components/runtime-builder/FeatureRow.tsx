import { Check, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PackageFeature } from "@/lib/runtime-builder/types-v2";

interface Props {
  feature: PackageFeature;
  selected: boolean;
  onToggle: () => void;
}

export function FeatureRow({ feature, selected, onToggle }: Props) {
  const requiredKinds =
    feature.requires?.infrastructure?.map((r) => r.kind) ?? [];
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full items-start justify-between gap-3 rounded-xl border p-3 text-left transition",
        selected
          ? "border-primary/50 bg-primary/5"
          : "border-border/50 hover:border-border hover:bg-muted/20",
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
              selected
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground",
            )}
          >
            {selected ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          </span>
          <span className="font-medium text-sm">{feature.displayName}</span>
        </div>
        {feature.description && (
          <p className="mt-1 pl-7 text-xs text-muted-foreground">
            {feature.description}
          </p>
        )}
        {requiredKinds.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1 pl-7">
            {requiredKinds.map((k) => (
              <Badge
                key={k}
                variant="outline"
                className="border-border/50 text-[10px] text-muted-foreground"
              >
                requires {k}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
