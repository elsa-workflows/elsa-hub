import type { CloudWorkspace } from "@/lib/cloudClient";
import { CLOUD_WORKSPACE_LABEL } from "@/lib/cloudClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CloudWorkspaceSwitcher({
  workspaces,
  selected,
  onSelect,
}: {
  workspaces: CloudWorkspace[];
  selected?: CloudWorkspace;
  onSelect: (workspaceId: string) => void;
}) {
  if (!selected && workspaces.length === 0) return null;

  const current = selected ?? workspaces[0];
  if (!current) return null;

  if (workspaces.length <= 1) {
    return (
      <p className="text-sm text-muted-foreground">
        {CLOUD_WORKSPACE_LABEL} <span className="font-medium text-foreground">{current.name}</span>
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{CLOUD_WORKSPACE_LABEL}</span>
      <Select value={current.id} onValueChange={onSelect}>
        <SelectTrigger className="h-8 w-[220px]" aria-label="Cloud workspace">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {workspaces.map((workspace) => (
            <SelectItem key={workspace.id} value={workspace.id}>
              {workspace.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
