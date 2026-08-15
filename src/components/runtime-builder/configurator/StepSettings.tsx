import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { useControlCatalog } from "@/lib/runtime-builder/control-api";
import type { FeatureSetting } from "@/lib/runtime-builder/control-api";
import {
  findImage,
  flattenFeatures,
  useConfigurator,
} from "@/lib/runtime-builder/configurator-store";

export function StepSettings() {
  const { data: catalog } = useControlCatalog();
  const { state, setEnvOverride, setSetting } = useConfigurator();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const image = findImage(catalog, state.imageSlug);
  const features = useMemo(() => flattenFeatures(catalog, image), [catalog, image]);
  const selected = features.filter((f) => state.features[f.featureId]);

  const envVars = (image?.envVars ?? []).filter((v) => showAdvanced || !v.advanced);
  const configurable = selected.filter((f) =>
    f.settings.some((s) => showAdvanced || !s.ui?.advanced),
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Settings</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Configure the runtime container and the features you selected. Anything left
            blank falls back to the image default.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="adv" checked={showAdvanced} onCheckedChange={setShowAdvanced} />
          <Label htmlFor="adv" className="cursor-pointer text-xs text-muted-foreground">
            Show advanced
          </Label>
        </div>
      </header>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Secrets are written into the generated files as placeholders — never commit real
          credentials to source control.
        </AlertDescription>
      </Alert>

      {image && (
        <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
          <h3 className="font-display text-base font-semibold">Container environment</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {envVars.map((v) => (
              <div key={v.name} className="space-y-1.5">
                <Label htmlFor={`env-${v.name}`} className="flex items-center gap-2 text-xs">
                  {v.displayName}
                  {v.required && <span className="text-destructive">*</span>}
                  {v.secret && (
                    <Badge variant="outline" className="text-[10px]">
                      secret
                    </Badge>
                  )}
                </Label>
                <Input
                  id={`env-${v.name}`}
                  type={v.secret ? "password" : "text"}
                  value={state.envOverrides[v.name] ?? ""}
                  placeholder={v.defaultValue ?? ""}
                  onChange={(e) => setEnvOverride(v.name, e.target.value)}
                />
                <p className="font-mono text-[10px] text-muted-foreground/70">{v.name}</p>
              </div>
            ))}
            {!envVars.length && (
              <p className="text-sm text-muted-foreground">
                This image exposes no configurable environment variables.
              </p>
            )}
          </div>
        </section>
      )}

      {configurable.map((feature) => (
        <section
          key={feature.featureId}
          className="rounded-2xl border border-border/60 bg-card/40 p-5"
        >
          <h3 className="font-display text-base font-semibold">{feature.displayName}</h3>
          <p className="font-mono text-[10px] text-muted-foreground/70">
            {feature.featureId}
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {feature.settings
              .filter((s) => showAdvanced || !s.ui?.advanced)
              .map((setting) => (
                <SettingField
                  key={setting.name}
                  setting={setting}
                  value={state.settings[feature.featureId]?.[setting.name]}
                  onChange={(v) => setSetting(feature.featureId, setting.name, v)}
                />
              ))}
          </div>
        </section>
      ))}

      {!configurable.length && (
        <p className="text-sm text-muted-foreground">
          None of the selected features expose settings{showAdvanced ? "" : " (try showing advanced)"}.
        </p>
      )}
    </div>
  );
}

function SettingField({
  setting,
  value,
  onChange,
}: {
  setting: FeatureSetting;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const id = `setting-${setting.name}`;
  const type = setting.jsonType ?? "string";

  if (type === "boolean") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 px-3 py-2.5">
        <Label htmlFor={id} className="cursor-pointer text-xs">
          {setting.displayName}
        </Label>
        <Switch
          id={id}
          checked={Boolean(value ?? setting.defaultValue)}
          onCheckedChange={onChange}
        />
      </div>
    );
  }

  const isNumber = type === "integer" || type === "number";
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-2 text-xs">
        {setting.displayName}
        {setting.required && <span className="text-destructive">*</span>}
        {setting.secret && (
          <Badge variant="outline" className="text-[10px]">
            secret
          </Badge>
        )}
      </Label>
      <Input
        id={id}
        type={setting.secret ? "password" : isNumber ? "number" : "text"}
        value={value === undefined || value === null ? "" : String(value)}
        placeholder={
          setting.defaultValue !== undefined && setting.defaultValue !== null
            ? String(setting.defaultValue)
            : type === "array"
              ? "comma,separated,values"
              : ""
        }
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") return onChange(undefined);
          if (isNumber) return onChange(Number(raw));
          if (type === "array") {
            return onChange(raw.split(",").map((s) => s.trim()).filter(Boolean));
          }
          onChange(raw);
        }}
      />
      {setting.description && (
        <p className="text-[11px] text-muted-foreground">{setting.description}</p>
      )}
    </div>
  );
}
