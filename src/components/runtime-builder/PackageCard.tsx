import { Package, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { PackageManifest } from "@/lib/runtime-builder/types-v2";

interface Props {
  pkg: PackageManifest;
  selected: boolean;
  selectedVersion: string | null;
  onToggle: (version: string) => void;
  onVersionChange: (version: string) => void;
}

export function PackageCard({
  pkg,
  selected,
  selectedVersion,
  onToggle,
  onVersionChange,
}: Props) {
  const version = selectedVersion ?? pkg.version;

  return (
    <button
      type="button"
      onClick={() => onToggle(version)}
      className={cn(
        "group flex w-full flex-col items-start gap-3 rounded-2xl border bg-card/40 p-5 text-left backdrop-blur-xl transition",
        selected
          ? "border-primary/60 shadow-[0_0_0_1px_hsl(var(--primary)/0.4)]"
          : "border-border/60 hover:border-border",
      )}
    >
      <div className="flex w-full items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              selected ? "bg-primary/15 text-primary" : "bg-muted/40 text-muted-foreground",
            )}
          >
            {selected ? <Check className="h-4 w-4" /> : <Package className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-semibold" title={pkg.displayName}>{pkg.displayName}</p>
            <p className="truncate font-mono text-[10px] text-muted-foreground" title={pkg.id}>{pkg.id}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant="outline" className="border-primary/40 text-[10px] text-primary">
            {pkg.licenseTier}
          </Badge>
          {pkg.stability !== "Stable" && (
            <Badge
              variant="outline"
              className="border-amber-500/40 text-[10px] text-amber-300"
            >
              {pkg.stability}
            </Badge>
          )}
        </div>
      </div>

      {pkg.description && (
        <p className="text-xs text-muted-foreground">{pkg.description}</p>
      )}

      <div className="flex w-full items-center justify-between gap-3">
        <Badge variant="outline" className="border-border/50 text-[10px]">
          {pkg.category}
        </Badge>
        <div onClick={(e) => e.stopPropagation()}>
          <Select
            value={version}
            onValueChange={(v) => onVersionChange(v)}
            disabled={!selected}
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
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
