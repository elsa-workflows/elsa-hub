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
  showCategory?: boolean;
  /** True when this package was added automatically by the dependency resolver. */
  autoAdded?: boolean;
}

export function PackageListRow({
  pkg,
  selected,
  selectedVersion,
  onToggle,
  onVersionChange,
  showCategory = true,
  autoAdded = false,
}: Props) {
  const version = selectedVersion ?? pkg.version;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onToggle(version)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle(version);
        }
      }}
      className={cn(
        "grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] items-center gap-3 border-b border-border/40 px-3 py-2 text-left text-sm transition hover:bg-card/60",
        selected && "bg-primary/[0.04]",
      )}
    >
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
          selected ? "bg-primary/15 text-primary" : "bg-muted/40 text-muted-foreground",
        )}
      >
        {selected ? <Check className="h-3.5 w-3.5" /> : <Package className="h-3.5 w-3.5" />}
      </span>

      <TooltipProvider delayDuration={250}>
        <div className="min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="truncate font-medium">{pkg.displayName}</p>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-sm break-all">
              {pkg.displayName}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="truncate font-mono text-[10px] text-muted-foreground">{pkg.id}</p>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-sm break-all font-mono text-xs">
              {pkg.id}
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {showCategory ? (
        <span className="hidden text-xs text-muted-foreground md:inline">{pkg.category}</span>
      ) : (
        <span />
      )}

      <div className="flex items-center gap-1">
        <Badge variant="outline" className="border-primary/40 px-1.5 py-0 text-[9px] uppercase text-primary">
          {pkg.licenseTier}
        </Badge>
        {pkg.stability !== "Stable" && (
          <Badge variant="outline" className="border-amber-500/40 px-1.5 py-0 text-[9px] uppercase text-amber-300">
            {pkg.stability}
          </Badge>
        )}
        {autoAdded && (
          <Badge variant="outline" className="border-muted-foreground/30 px-1.5 py-0 text-[9px] uppercase text-muted-foreground">
            Required
          </Badge>
        )}
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <Select value={version} onValueChange={onVersionChange} disabled={!selected}>
          <SelectTrigger className="h-7 w-[110px] text-xs">
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
  );
}
