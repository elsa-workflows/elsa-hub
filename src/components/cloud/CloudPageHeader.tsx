import type { CloudWorkspace } from "@/lib/cloudClient";
import { CLOUD_PAGE_TITLE } from "@/lib/cloudClient";
import { CloudManageLink } from "./CloudManageLink";
import { CloudWorkspaceSwitcher } from "./CloudWorkspaceSwitcher";

export function CloudPageHeader({
  title = CLOUD_PAGE_TITLE,
  description,
  workspaces,
  selectedWorkspace,
  onSelectWorkspace,
}: {
  title?: string;
  description?: string;
  workspaces: CloudWorkspace[];
  selectedWorkspace?: CloudWorkspace;
  onSelectWorkspace: (workspaceId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {description ? <p className="text-muted-foreground">{description}</p> : null}
        <CloudWorkspaceSwitcher
          workspaces={workspaces}
          selected={selectedWorkspace}
          onSelect={onSelectWorkspace}
        />
      </div>
      <CloudManageLink />
    </div>
  );
}
