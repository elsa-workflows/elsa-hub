import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SettingSchema } from "@/lib/runtime-builder/types-v2";

export interface EditorProps {
  id: string;
  setting: SettingSchema;
  value: unknown;
  onChange: (value: unknown) => void;
}

export interface SettingEditor {
  id: string;
  /** Higher-priority editors match first. Order in the array also breaks ties. */
  match: (s: SettingSchema) => boolean;
  /** `inline` editors render their own label (e.g., checkbox + label-right). */
  layout?: "inline" | "stacked";
  render: (props: EditorProps) => JSX.Element;
}

// ---------- Boolean (checkbox + inline label) ----------
const booleanEditor: SettingEditor = {
  id: "boolean",
  match: (s) => s.type === "boolean" || s.jsonType === "boolean",
  layout: "inline",
  render: ({ id, setting, value, onChange }) => {
    const checked = Boolean(value ?? setting.defaultValue ?? false);
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(v) => onChange(v === true)}
        />
        <Label htmlFor={id} className="cursor-pointer text-xs font-medium">
          {setting.displayName}
          {setting.required && <span className="ml-1 text-destructive">*</span>}
        </Label>
      </div>
    );
  },
};

// ---------- Boolean (switch) — alternative, kept for future opt-in ----------
export const booleanSwitchEditor: SettingEditor = {
  id: "boolean-switch",
  match: (s) => (s.type === "boolean" || s.jsonType === "boolean") && s.ui?.widget === "switch",
  layout: "stacked",
  render: ({ id, setting, value, onChange }) => (
    <Switch
      id={id}
      checked={Boolean(value ?? setting.defaultValue ?? false)}
      onCheckedChange={(v) => onChange(v)}
    />
  ),
};

// ---------- Enum (dropdown) ----------
const enumEditor: SettingEditor = {
  id: "enum",
  match: (s) => s.type === "enum" && Array.isArray(s.enumValues) && s.enumValues.length > 0,
  render: ({ id, setting, value, onChange }) => (
    <Select
      value={(value as string | undefined) ?? (setting.defaultValue as string | undefined) ?? ""}
      onValueChange={(v) => onChange(v)}
    >
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {setting.enumValues!.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ),
};

// ---------- Number ----------
const numberEditor: SettingEditor = {
  id: "number",
  match: (s) => s.type === "number" || s.jsonType === "integer" || s.jsonType === "number",
  render: ({ id, setting, value, onChange }) => (
    <Input
      id={id}
      type="number"
      value={
        (value as number | undefined) ??
        (setting.defaultValue as number | undefined) ??
        ""
      }
      placeholder={setting.placeholder}
      onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
    />
  ),
};

// ---------- Secret string (password + reveal) ----------
const secretEditor: SettingEditor = {
  id: "secret",
  match: (s) => Boolean(s.secret),
  render: function SecretEditor({ id, setting, value, onChange }) {
    const [revealed, setRevealed] = useState(false);
    return (
      <div className="flex gap-2">
        <Input
          id={id}
          type={revealed ? "text" : "password"}
          value={(value as string | undefined) ?? ""}
          placeholder={setting.placeholder ?? (setting.defaultValue as string | undefined)}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => setRevealed((r) => !r)}
        >
          {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    );
  },
};

// ---------- String fallback ----------
const stringEditor: SettingEditor = {
  id: "string",
  match: () => true,
  render: ({ id, setting, value, onChange }) => (
    <Input
      id={id}
      type="text"
      value={(value as string | undefined) ?? ""}
      placeholder={setting.placeholder ?? (setting.defaultValue as string | undefined)}
      onChange={(e) => onChange(e.target.value)}
      className="font-mono text-xs"
    />
  ),
};

/**
 * Ordered registry. Add new specialized editors (async dropdown, duration,
 * key/value list, ...) above `stringEditor`. First match wins.
 */
const editors: SettingEditor[] = [
  booleanSwitchEditor,
  booleanEditor,
  enumEditor,
  numberEditor,
  secretEditor,
  stringEditor,
];

export function resolveEditor(setting: SettingSchema): SettingEditor {
  return editors.find((e) => e.match(setting)) ?? stringEditor;
}
