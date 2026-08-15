import { useMemo } from "react";
import { Box, Database, Package, Sliders } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useControlCatalog } from "@/lib/runtime-builder/control-api";
import {
  findImage,
  flattenFeatures,
  requiredInfrastructure,
  useConfigurator,
} from "@/lib/runtime-builder/configurator-store";

export function ConfiguratorSummary() {
  const { data: catalog } = useControlCatalog();
  const { state } = useConfigurator();

  const image = findImage(catalog, state.imageSlug);
  const features = useMemo(() => flattenFeatures(catalog, image), [catalog, image]);
  const selected = features.filter((f) => state.features[f.featureId]);
  const requirements = requiredInfrastructure(selected);
  const resolvedInfra = requirements.filter((r) => state.infrastructure[r.id]).length;
  const settingsCount = Object.values(state.settings).reduce(
    (acc, s) => acc + Object.keys(s).length,
    0,
  );

  return (
    <aside className="sticky top-24 flex flex-col gap-5 rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-xl">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Configuration
        </p>
        <h3 className="mt-1 font-display text-lg font-semibold">Your runtime</h3>
      </div>

      <Row icon={Box} label="Runtime">
        {image ? (
          <code className="font-mono text-[11px]">
            {image.slug}:{state.tag || image.defaultTag}
          </code>
        ) : (
          <span className="text-muted-foreground">Not selected</span>
        )}
      </Row>

      <Row icon={Package} label="Features">
        {selected.length ? `${selected.length} selected` : "None"}
      </Row>

      <Row icon={Sliders} label="Settings">
        {settingsCount + Object.keys(state.envOverrides).filter((k) => state.envOverrides[k]).length}{" "}
        set
      </Row>

      <Row icon={Database} label="Infrastructure">
        {requirements.length ? `${resolvedInfra}/${requirements.length} chosen` : "—"}
      </Row>

      <Separator />

      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Selected features
        </p>
        {selected.length ? (
          <ul className="max-h-56 space-y-1 overflow-auto text-xs text-muted-foreground">
            {selected.map((f) => (
              <li key={f.featureId} className="truncate">
                {f.displayName}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">Nothing selected yet.</p>
        )}
      </div>

      {catalog?.degraded && (
        <p className="text-[11px] text-amber-500">
          {catalog.degradedReason ?? "Catalog service degraded."}
        </p>
      )}
    </aside>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="text-right text-foreground">{children}</span>
    </div>
  );
}
