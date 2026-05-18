import { useState } from "react";
import { Plus, Trash2, ExternalLink, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useRuntimeBuilder } from "@/lib/runtime-builder/store";

export function StepSources() {
  const {
    state,
    addPackageSource,
    updatePackageSource,
    removePackageSource,
    setLocalPackagesEnabled,
    setLocalPackagesDirectory,
  } = useRuntimeBuilder();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const local = state.localPackages ?? { enabled: false, directoryPath: "packages" };



  function add() {
    if (!name.trim() || !url.trim()) return;
    addPackageSource({
      name: name.trim(),
      url: url.trim(),
      protocol: "nuget-v3",
      authMode: "none",
      enabled: true,
    });
    setName("");
    setUrl("");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Package sources
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          NuGet feeds the catalog will read package manifests from. The
          built-in feeds are enough for most setups; add private feeds for
          internal packages.
        </p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <FolderOpen className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Enable package drop folder</p>
              <p className="max-w-xl text-xs text-muted-foreground">
                Mounts a host folder into the running container as a local
                NuGet feed. Drop additional <code className="font-mono">.nupkg</code> files
                into it after deployment and they become available to the
                running Elsa container without rebuilding the image.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="local-packages-enabled"
              checked={local.enabled}
              onCheckedChange={setLocalPackagesEnabled}
            />
            <Label
              htmlFor="local-packages-enabled"
              className="cursor-pointer text-xs text-muted-foreground"
            >
              Enabled
            </Label>
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          <Label htmlFor="local-packages-dir" className="text-xs text-muted-foreground">
            Directory (relative to <code className="font-mono">docker-compose.yml</code>)
          </Label>
          <Input
            id="local-packages-dir"
            value={local.directoryPath}
            disabled={!local.enabled}
            onChange={(e) => setLocalPackagesDirectory(e.target.value)}
            placeholder="packages"
            className="max-w-sm font-mono text-xs"
          />
        </div>
      </div>



      <div className="space-y-3">
        {state.packageSources.map((src) => (
          <div
            key={src.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur-xl"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium">{src.name}</p>
                <Badge variant="outline" className="text-[10px]">
                  {src.protocol}
                </Badge>
                {src.authMode === "apiKey" && (
                  <Badge
                    variant="outline"
                    className="border-amber-500/40 text-[10px] text-amber-300"
                  >
                    API key
                  </Badge>
                )}
              </div>
              <a
                href={src.url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 flex items-center gap-1 truncate font-mono text-[11px] text-muted-foreground hover:text-foreground"
              >
                {src.url} <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  id={`enabled-${src.id}`}
                  checked={src.enabled}
                  onCheckedChange={(v) =>
                    updatePackageSource(src.id, { enabled: v })
                  }
                />
                <Label
                  htmlFor={`enabled-${src.id}`}
                  className="cursor-pointer text-xs text-muted-foreground"
                >
                  Enabled
                </Label>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removePackageSource(src.id)}
                aria-label={`Remove ${src.name}`}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-5">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Add a feed
        </p>
        <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
          <Input
            placeholder="Display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="https://api.nuget.org/v3/index.json"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="font-mono text-xs"
          />
          <Button onClick={add} disabled={!name.trim() || !url.trim()}>
            <Plus className="mr-1.5 h-4 w-4" /> Add
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Private feeds requiring an API key are stored only in your browser for
          this preview.
        </p>
      </div>
    </div>
  );
}
