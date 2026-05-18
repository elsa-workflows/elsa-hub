import { Sliders, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRuntimeBuilder } from "@/lib/runtime-builder/store";
import { findBuilderImage, resolveEnvDefault } from "@/lib/runtime-builder/images";

export function StepImageConfig() {
  const { state, setImageEnv, resetImageEnv } = useRuntimeBuilder();
  const selection = state.imageSelection;
  const image = findBuilderImage(selection.slug);

  if (!image) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
        Select a Docker image first.
      </div>
    );
  }

  const overrides = selection.envOverrides ?? {};
  const hasOverrides = Object.values(overrides).some((v) => v !== "");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Image configuration
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Configure environment variables for{" "}
          <code className="font-mono">{image.image}</code>. Defaults are derived
          from your image and host port — override only what you need.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 bg-card/30 px-4 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Sliders className="h-3.5 w-3.5" />
          <span>
            {image.envDefaults.length} variable
            {image.envDefaults.length === 1 ? "" : "s"} · host port{" "}
            <code className="font-mono">{selection.hostPort}</code>
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasOverrides}
          onClick={() => resetImageEnv()}
          className="h-7 text-xs"
        >
          <RotateCcw className="mr-1.5 h-3 w-3" /> Reset all
        </Button>
      </div>

      <div className="space-y-3">
        {image.envDefaults.length === 0 && (
          <div className="rounded-xl border border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
            This image has no configurable environment variables.
          </div>
        )}

        {image.envDefaults.map((env) => {
          const defaultValue = resolveEnvDefault(env.value, selection.hostPort);
          const override = overrides[env.key];
          const isOverridden =
            typeof override === "string" && override !== defaultValue;
          const displayValue =
            typeof override === "string" ? override : defaultValue;

          return (
            <div
              key={env.key}
              className="rounded-xl border border-border/60 bg-card/40 p-4 backdrop-blur-xl"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label
                  htmlFor={`env-${env.key}`}
                  className="break-all font-mono text-xs"
                >
                  {env.key}
                </Label>
                <div className="flex items-center gap-1.5">
                  {env.required && (
                    <Badge
                      variant="outline"
                      className="border-amber-500/40 text-[10px] text-amber-400"
                    >
                      Required
                    </Badge>
                  )}
                  {isOverridden && (
                    <Badge
                      variant="outline"
                      className="border-primary/40 text-[10px] text-primary"
                    >
                      Overridden
                    </Badge>
                  )}
                </div>
              </div>

              {env.description && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {env.description}
                </p>
              )}

              <div className="mt-3 flex gap-2">
                <Input
                  id={`env-${env.key}`}
                  value={displayValue}
                  onChange={(e) => setImageEnv(env.key, e.target.value)}
                  placeholder={defaultValue || "(unset)"}
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={!isOverridden}
                  onClick={() => resetImageEnv(env.key)}
                  className="shrink-0"
                  title="Reset to default"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>

              {defaultValue && !isOverridden && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Default:{" "}
                  <code className="font-mono">{defaultValue}</code>
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
