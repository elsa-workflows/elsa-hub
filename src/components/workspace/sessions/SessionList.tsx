import { format } from "date-fns";
import { Calendar, Users, Clock, Sparkles, NotebookPen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewSessionDialog } from "./NewSessionDialog";
import { useWorkspaceSessions, type WorkspaceSession } from "@/hooks/useWorkspaceSessions";

const TYPE_LABEL: Record<string, string> = {
  call: "Call",
  workshop: "Workshop",
  async_review: "Async review",
  other: "Other",
};

interface SessionListProps {
  workspaceId: string;
  selectedId?: string | null;
  onSelect: (s: WorkspaceSession) => void;
}

export function SessionList({ workspaceId, selectedId, onSelect }: SessionListProps) {
  const { list } = useWorkspaceSessions(workspaceId);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {list.data?.length ?? 0} session{(list.data?.length ?? 0) === 1 ? "" : "s"}
        </p>
        <NewSessionDialog workspaceId={workspaceId} onCreated={onSelect} />
      </div>

      {list.isLoading && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-muted/40 animate-pulse rounded" />
          ))}
        </div>
      )}

      {!list.isLoading && (list.data?.length ?? 0) === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          <NotebookPen className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium">No sessions yet</p>
          <p className="text-xs mt-1">
            Record calls, workshops, and reviews. Attach files and let AI extract action items.
          </p>
        </Card>
      )}

      <div className="space-y-2">
        {list.data?.map((s) => (
          <Card
            key={s.id}
            onClick={() => onSelect(s)}
            className={`p-4 cursor-pointer transition-colors hover:bg-accent/40 ${
              selectedId === s.id ? "border-primary bg-accent/30" : ""
            }`}
          >
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{s.title}</p>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(s.occurred_at), "MMM d, yyyy · HH:mm")}
                  </span>
                  {s.duration_minutes != null && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {s.duration_minutes} min
                    </span>
                  )}
                  {s.participants.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {s.participants.length}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge variant="secondary">{TYPE_LABEL[s.session_type] ?? s.session_type}</Badge>
                {s.ai_summary && (
                  <span className="flex items-center gap-1 text-xs text-primary">
                    <Sparkles className="h-3 w-3" />
                    AI summary
                  </span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
