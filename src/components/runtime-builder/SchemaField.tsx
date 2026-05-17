import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { envVarFromHint, type SettingSchema } from "@/lib/runtime-builder/types-v2";
import { resolveEditor } from "./settings/editors";

interface Props {
  setting: SettingSchema;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function SchemaField({ setting, value, onChange }: Props) {
  const id = `field-${setting.name}`;
  const editor = resolveEditor(setting);
  const inline = editor.layout === "inline";
  const EditorComponent = editor.render;

  return (
    <div className="space-y-1.5">
      {inline ? (
        <div className="flex items-center justify-between gap-2">
          <EditorComponent id={id} setting={setting} value={value} onChange={onChange} />
          <FieldBadges setting={setting} />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={id} className="text-xs font-medium">
              {setting.displayName}
              {setting.required && <span className="ml-1 text-destructive">*</span>}
            </Label>
            <FieldBadges setting={setting} />
          </div>
          <EditorComponent id={id} setting={setting} value={value} onChange={onChange} />
        </>
      )}

      {setting.description && (
        <p className="text-[11px] text-muted-foreground">{setting.description}</p>
      )}
      {setting.envHint && (
        <p className="font-mono text-[10px] text-muted-foreground">
          → env: {envVarFromHint(setting.envHint)}
        </p>
      )}
    </div>
  );
}

function FieldBadges({ setting }: { setting: SettingSchema }) {
  if (!setting.secret && !setting.advanced) return null;
  return (
    <div className="flex gap-1">
      {setting.secret && (
        <Badge
          variant="outline"
          className="border-amber-500/40 px-1.5 py-0 text-[9px] text-amber-300"
        >
          Secret
        </Badge>
      )}
      {setting.advanced && (
        <Badge
          variant="outline"
          className="border-border/50 px-1.5 py-0 text-[9px] text-muted-foreground"
        >
          Advanced
        </Badge>
      )}
    </div>
  );
}
