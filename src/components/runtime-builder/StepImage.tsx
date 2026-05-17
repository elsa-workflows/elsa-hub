import { Container, LayoutDashboard, Boxes, ExternalLink, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useRuntimeBuilder } from "@/lib/runtime-builder/store";
import {
  RUNTIME_BUILDER_IMAGES,
  findBuilderImage,
  type BuilderImage,
} from "@/lib/runtime-builder/images";

const ICONS: Record<BuilderImage["role"], typeof Container> = {
  server: Container,
  studio: LayoutDashboard,
  combined: Boxes,
};

export function StepImage() {
  const { state, setImageSlug, setImageTag, setImageHostPort } =
    useRuntimeBuilder();
  const selection = state.imageSelection;
  const current = findBuilderImage(selection.slug);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Docker image
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Pick the runtime image your bundle will deploy. Server runs the API
          only, Studio is the designer UI, Combined ships both in one
          container.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {RUNTIME_BUILDER_IMAGES.map((img) => {
          const Icon = ICONS[img.role];
          const selected = img.slug === selection.slug;
          return (
            <button
              key={img.slug}
              type="button"
              onClick={() => {
                setImageSlug(img.slug);
                // Snap host port to the image default so the field reflects a
                // sensible starting point per image.
                setImageHostPort(img.defaultHostPort);
              }}
              className={cn(
                "group flex flex-col items-start gap-3 rounded-2xl border p-5 text-left transition",
                "bg-card/40 backdrop-blur-xl",
                selected
                  ? "border-primary/70 bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.4)]"
                  : "border-border/60 hover:border-border hover:bg-card/60",
              )}
            >
              <div className="flex w-full items-start justify-between">
                <Icon
                  className={cn(
                    "h-6 w-6",
                    selected ? "text-primary" : "text-muted-foreground",
                  )}
                />
                {img.requiresServer && (
                  <Badge
                    variant="outline"
                    className="border-amber-500/40 text-[10px] text-amber-400"
                  >
                    Requires Server
                  </Badge>
                )}
              </div>
              <div>
                <div className="font-semibold">{img.name}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {img.tagline}
                </p>
              </div>
              <code className="mt-auto truncate font-mono text-[11px] text-muted-foreground">
                {img.image}
              </code>
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-xl sm:grid-cols-[1fr_180px]">
        <div className="space-y-2">
          <Label htmlFor="image-tag">Tag</Label>
          <Input
            id="image-tag"
            value={selection.tag}
            onChange={(e) => setImageTag(e.target.value.trim() || "latest")}
            placeholder="latest"
            className="font-mono"
          />
          <p className="text-[11px] text-muted-foreground">
            Pulled as{" "}
            <code className="font-mono">
              {current?.image ?? selection.slug}:{selection.tag || "latest"}
            </code>
            .
            {current && (
              <>
                {" "}
                <a
                  href={current.dockerHubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Docker Hub <ExternalLink className="h-3 w-3" />
                </a>
              </>
            )}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="image-port">Host port</Label>
          <Input
            id="image-port"
            type="number"
            min={1}
            max={65535}
            value={selection.hostPort}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10);
              if (!Number.isNaN(n) && n > 0 && n < 65536) setImageHostPort(n);
            }}
            className="font-mono"
          />
          <p className="text-[11px] text-muted-foreground">
            Container port:{" "}
            <code className="font-mono">{current?.containerPort ?? 8080}</code>
          </p>
        </div>
      </div>

      {current?.requiresServer && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div className="space-y-1">
            <p className="font-medium">Studio needs a running Elsa Server.</p>
            <p className="text-xs text-muted-foreground">
              The generated bundle will include both the Studio and an
              accompanying Elsa Pro Server service so it boots out of the box.
              Adjust env vars in <code>.env.example</code> before deploying.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
