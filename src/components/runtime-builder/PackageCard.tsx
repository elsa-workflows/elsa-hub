import { Package, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { PackageManifest } from "@/lib/runtime-builder/types-v2";

interface Props {
  pkg: PackageManifest;
  selected: boolean;
  selectedVersion: string | null;
  onToggle: (version: string) => void;
  onVersionChange: (version: string) => void;
  /** Hide the category pill (useful when already filtered by category). */
  hideCategory?: boolean;
}

export function PackageCard({
  pkg,
  selected,
  selectedVersion,
  onToggle,
  onVersionChange,
  hideCategory = false,
}: Props) {
  const version = selectedVersion ?? pkg.version;

  return (
    <button
      type="button"
      onClick={() => onToggle(version)}
      className={cn(
        "group flex w-full flex-col items-start gap-2 rounded-lg border bg-card/40 p-3 text-left transition",
        selected
          ? "border-primary/60 bg-primary/[0.04] shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]"
          : "border-border/60 hover:border-border hover:bg-card/60",
      )}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <span
            className={cn(
              "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
              selected ? "bg-primary/15 text-primary" : "bg-muted/40 text-muted-foreground",
            )}
          >
            {selected ? <Check className="h-3.5 w-3.5" /> : <Package className="h-3.5 w-3.5" />}
          </span>
          <TooltipProvider delayDuration={250}>
            <div className="min-w-0 flex-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="line-clamp-2 break-words text-sm font-medium leading-snug">
                    {pkg.displayName}
                  </p>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-sm break-all">
                  {pkg.displayName}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                    {pkg.id}
                  </p>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-sm break-all font-mono text-xs">
                  {pkg.id}
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant="outline" className="border-primary/40 px-1.5 py-0 text-[9px] uppercase text-primary">
            {pkg.licenseTier}
          </Badge>
          {pkg.stability !== "Stable" && (
            <Badge
              variant="outline"
              className="border-amber-500/40 px-1.5 py-0 text-[9px] uppercase text-amber-300"
            >
              {pkg.stability}
            </Badge>
          )}
        </div>
      </div>

      {pkg.description && (
        <p className="line-clamp-2 text-xs text-muted-foreground">{pkg.description}</p>
      )}

      <div className="mt-auto flex w-full items-center justify-between gap-2 pt-1">
        {!hideCategory ? (
          <Badge variant="outline" className="border-border/50 text-[10px] font-normal">
            {pkg.category}
          </Badge>
        ) : (
          <span />
        )}
        <div onClick={(e) => e.stopPropagation()}>
          <Select
            value={version}
            onValueChange={(v) => onVersionChange(v)}
            disabled={!selected}
          >
            <SelectTrigger className="h-7 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pkg.versions.map((v) => (
                <SelectItem key={v} value={v} className="text-xs">
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </button>
  );
}
