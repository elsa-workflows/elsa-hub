import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { envVarFromHint, type SettingSchema } from "@/lib/runtime-builder/types-v2";

interface Props {
  setting: SettingSchema;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function SchemaField({ setting, value, onChange }: Props) {
  const id = `field-${setting.name}`;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-xs font-medium">
          {setting.displayName}
          {setting.required && <span className="ml-1 text-destructive">*</span>}
        </Label>
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
      </div>
      <FieldControl id={id} setting={setting} value={value} onChange={onChange} />
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

function FieldControl({
  id,
  setting,
  value,
  onChange,
}: Props & { id: string }) {
  const [revealed, setRevealed] = useState(false);

  if (setting.type === "boolean") {
    return (
      <Switch
        id={id}
        checked={Boolean(value ?? setting.defaultValue ?? false)}
        onCheckedChange={(v) => onChange(v)}
      />
    );
  }

  if (setting.type === "number") {
    return (
      <Input
        id={id}
        type="number"
        value={(value as number | undefined) ?? (setting.defaultValue as number | undefined) ?? ""}
        placeholder={setting.placeholder}
        onChange={(e) =>
          onChange(e.target.value === "" ? "" : Number(e.target.value))
        }
      />
    );
  }

  if (setting.type === "enum" && setting.enumValues) {
    return (
      <Select
        value={(value as string | undefined) ?? (setting.defaultValue as string | undefined) ?? ""}
        onValueChange={(v) => onChange(v)}
      >
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {setting.enumValues.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // string fallback (incl. secret)
  return (
    <div className="flex gap-2">
      <Input
        id={id}
        type={setting.secret && !revealed ? "password" : "text"}
        value={(value as string | undefined) ?? ""}
        placeholder={setting.placeholder ?? (setting.defaultValue as string | undefined)}
        onChange={(e) => onChange(e.target.value)}
        className="font-mono text-xs"
      />
      {setting.secret && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => setRevealed((r) => !r)}
        >
          {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      )}
    </div>
  );
}
