import { useState } from "react";
import { Files, NotebookPen, ListChecks, Gavel } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { FileUploader } from "./FileUploader";
import { FileList, type SummaryPayload } from "./FileList";
import { SessionList } from "./sessions/SessionList";
import { SessionDetail } from "./sessions/SessionDetail";
import { useEngagementWorkspace } from "@/hooks/useEngagementWorkspace";
import type { WorkspaceSession } from "@/hooks/useWorkspaceSessions";

interface EngagementWorkspaceProps {
  organizationId: string;
  serviceProviderId: string;
  title: string;
  subtitle?: string;
  onSummaryReady?: (payload: SummaryPayload) => void;
  onLogWorkFromSession?: (s: WorkspaceSession) => void;
}

export function EngagementWorkspace({
  organizationId,
  serviceProviderId,
  title,
  subtitle,
  onSummaryReady,
  onLogWorkFromSession,
}: EngagementWorkspaceProps) {
  const { data: workspaceId, isLoading, error } = useEngagementWorkspace(
    organizationId,
    serviceProviderId,
  );
  const [tab, setTab] = useState("sessions");
  const [activeSession, setActiveSession] = useState<WorkspaceSession | null>(null);

  if (isLoading) {
    return <div className="h-32 bg-muted/40 animate-pulse rounded-lg" />;
  }

  if (error || !workspaceId) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        Could not open this workspace. {error?.message}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v); if (v !== "sessions") setActiveSession(null); }}>
        <TabsList>
          <TabsTrigger value="sessions">
            <NotebookPen className="h-4 w-4 mr-2" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="files">
            <Files className="h-4 w-4 mr-2" />
            Files
          </TabsTrigger>
          <TabsTrigger value="actions" disabled>
            <ListChecks className="h-4 w-4 mr-2" />
            Actions
          </TabsTrigger>
          <TabsTrigger value="decisions" disabled>
            <Gavel className="h-4 w-4 mr-2" />
            Decisions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="mt-6">
          {activeSession ? (
            <SessionDetail
              workspaceId={workspaceId}
              session={activeSession}
              onBack={() => setActiveSession(null)}
              onLogWork={onLogWorkFromSession}
            />
          ) : (
            <SessionList
              workspaceId={workspaceId}
              selectedId={activeSession ? (activeSession as WorkspaceSession).id : null}
              onSelect={setActiveSession}
            />
          )}
        </TabsContent>

        <TabsContent value="files" className="space-y-4 mt-6">
          <FileUploader workspaceId={workspaceId} />
          <FileList workspaceId={workspaceId} onSummaryReady={onSummaryReady} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
