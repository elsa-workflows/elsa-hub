import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, Server } from "lucide-react";
import type { RuntimeImage } from "@/lib/runtime-builder/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  image: RuntimeImage;
  selected: boolean;
  selectedVersion: string | null;
  onSelect: (version: string) => void;
  onChangeVersion: (version: string) => void;
}

export function ImagePickerCard({
  image,
  selected,
  selectedVersion,
  onSelect,
  onChangeVersion,
}: Props) {
  return (
    <button
      type="button"
      onClick={() => onSelect(selectedVersion ?? image.versions[0])}
      className={cn(
        "group relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl border bg-card/40 p-5 text-left backdrop-blur-xl transition",
        "hover:border-primary/40 hover:bg-card/60",
        selected
          ? "border-primary/60 shadow-[0_0_0_1px_hsl(var(--primary)/0.5)] bg-primary/[0.06]"
          : "border-border/60",
      )}
    >
      {selected && (
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
          <CheckCircle2 className="h-3 w-3" /> Selected
        </span>
      )}

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background/60">
          <Server className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold">{image.displayName}</h3>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            {image.dockerImage}
          </p>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        {image.description}
      </p>

      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline" className="border-primary/30 text-primary">
          {image.licenseTier}
        </Badge>
        <Badge variant="outline" className="border-border/50">
          {image.stability}
        </Badge>
        <Badge variant="outline" className="border-border/50">
          Elsa {image.elsaVersion}
        </Badge>
        <Badge variant="outline" className="border-border/50">
          ~ {image.estimatedSizeMb} MB
        </Badge>
      </div>

      <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
        {image.capabilities.slice(0, 6).map((cap) => (
          <span
            key={cap}
            className="rounded-md border border-border/40 bg-background/40 px-1.5 py-0.5"
          >
            {cap}
          </span>
        ))}
        {image.capabilities.length > 6 && (
          <span className="rounded-md border border-border/40 bg-background/40 px-1.5 py-0.5">
            +{image.capabilities.length - 6}
          </span>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        <span className="text-foreground/80">For:</span> {image.audience}
      </p>

      <div
        className="mt-auto flex items-center justify-between gap-2 pt-1"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Version
        </span>
        <Select
          value={selectedVersion ?? image.versions[0]}
          onValueChange={onChangeVersion}
        >
          <SelectTrigger className="h-8 w-auto min-w-[8rem] gap-2 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {image.versions.map((version) => (
              <SelectItem key={version} value={version} className="font-mono text-xs">
                {version}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </button>
  );
}
