import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Check, Server } from "lucide-react";
import { useControlCatalog } from "@/lib/runtime-builder/control-api";
import { findImage, useConfigurator } from "@/lib/runtime-builder/configurator-store";

export function StepRuntime() {
  const { data: catalog, isLoading } = useControlCatalog();
  const { state, setImage, setTag, setHostPort } = useConfigurator();
  const selected = findImage(catalog, state.imageSlug);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Runtime</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Pick the container image your deployment is based on. The runtime you choose
          determines which features are available in the next step.
        </p>
      </header>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {(catalog?.images ?? []).map((image) => {
            const active = image.slug === state.imageSlug;
            return (
              <button
                key={image.slug}
                type="button"
                onClick={() => setImage(image)}
                className={cn(
                  "flex h-full flex-col gap-3 rounded-2xl border p-4 text-left transition",
                  active
                    ? "border-primary/60 bg-primary/5 ring-1 ring-primary/30"
                    : "border-border/60 bg-card/40 hover:border-border hover:bg-card/70",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  {active && <Check className="h-4 w-4 text-primary" />}
                </div>
                <div>
                  <p className="font-medium">{image.displayName}</p>
                  <code className="font-mono text-[11px] text-muted-foreground">
                    {image.image}
                  </code>
                </div>
                {image.description && (
                  <p className="text-xs text-muted-foreground">{image.description}</p>
                )}
                <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                  {image.runtimeKinds.map((kind) => (
                    <Badge key={kind} variant="outline" className="text-[10px]">
                      {kind}
                    </Badge>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="grid gap-4 rounded-2xl border border-border/60 bg-card/40 p-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tag">Image tag</Label>
            <Select value={state.tag || selected.defaultTag} onValueChange={setTag}>
              <SelectTrigger id="tag">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(selected.availableTags.length
                  ? selected.availableTags
                  : [selected.defaultTag]
                ).map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hostPort">Host port</Label>
            <Input
              id="hostPort"
              type="number"
              min={1}
              max={65535}
              value={state.hostPort}
              onChange={(e) => setHostPort(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Container listens on {selected.defaultPort}.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
