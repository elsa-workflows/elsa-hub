import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Sparkles,
  Loader2,
  Save,
  Trash2,
  Clock as ClockIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import {
  useWorkspaceSessions,
  type WorkspaceSession,
} from "@/hooks/useWorkspaceSessions";
import { FileUploader } from "../FileUploader";
import { FileList } from "../FileList";

const TYPE_LABEL: Record<string, string> = {
  call: "Call",
  workshop: "Workshop",
  async_review: "Async review",
  other: "Other",
};

interface SessionDetailProps {
  workspaceId: string;
  session: WorkspaceSession;
  onBack: () => void;
  onLogWork?: (s: WorkspaceSession) => void;
}

export function SessionDetail({ workspaceId, session, onBack, onLogWork }: SessionDetailProps) {
  const { update, remove, summarize } = useWorkspaceSessions(workspaceId);
  const [notes, setNotes] = useState(session.notes_markdown);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setNotes(session.notes_markdown);
    setDirty(false);
  }, [session.id, session.notes_markdown]);

  const handleSaveNotes = async () => {
    try {
      await update.mutateAsync({ id: session.id, patch: { notes_markdown: notes } });
      toast({ title: "Notes saved" });
      setDirty(false);
    } catch (err: any) {
      toast({ title: "Save failed", description: err?.message, variant: "destructive" });
    }
  };

  const handleSummarize = async () => {
    try {
      await summarize.mutateAsync(session.id);
      toast({ title: "AI summary ready" });
    } catch (err: any) {
      toast({
        title: "Could not generate summary",
        description: err?.message || "Make sure there are notes or a transcript attached.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    try {
      await remove.mutateAsync(session.id);
      toast({ title: "Session deleted" });
      onBack();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Sessions
        </Button>
        <div className="flex items-center gap-2">
          {onLogWork && (
            <Button variant="outline" size="sm" onClick={() => onLogWork(session)}>
              <ClockIcon className="h-4 w-4 mr-2" />
              Log work
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" title="Delete session">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this session?</AlertDialogTitle>
                <AlertDialogDescription>
                  Notes and AI summary will be removed. Attached files will remain in the workspace.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-xl font-semibold">{session.title}</h2>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(session.occurred_at), "EEE, MMM d, yyyy · HH:mm")}
              </span>
              {session.duration_minutes != null && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {session.duration_minutes} min
                </span>
              )}
              {session.participants.length > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {session.participants.join(", ")}
                </span>
              )}
            </div>
          </div>
          <Badge variant="secondary">{TYPE_LABEL[session.session_type] ?? session.session_type}</Badge>
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">Notes</Label>
          {dirty && (
            <Button size="sm" onClick={handleSaveNotes} disabled={update.isPending}>
              {update.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          )}
        </div>
        <Textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setDirty(true);
          }}
          rows={8}
          placeholder="Topics discussed, decisions made, follow-ups…"
        />
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI summary
            </Label>
            {session.ai_generated_at && (
              <p className="text-xs text-muted-foreground mt-1">
                Generated {format(new Date(session.ai_generated_at), "MMM d, yyyy · HH:mm")}
              </p>
            )}
          </div>
          <Button
            size="sm"
            variant={session.ai_summary ? "outline" : "default"}
            onClick={handleSummarize}
            disabled={summarize.isPending}
          >
            {summarize.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {session.ai_summary ? "Regenerate" : "Summarize with AI"}
          </Button>
        </div>

        {!session.ai_summary && (
          <p className="text-sm text-muted-foreground">
            Add notes or attach a transcript below, then generate a summary, key points, and action items.
          </p>
        )}

        {session.ai_summary && (
          <div className="space-y-3">
            <p className="text-sm whitespace-pre-wrap">{session.ai_summary}</p>
            {session.ai_key_points && session.ai_key_points.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">Key points</p>
                <ul className="text-sm list-disc pl-5 space-y-1">
                  {session.ai_key_points.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            {session.ai_action_items && session.ai_action_items.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">Action items</p>
                <ul className="text-sm list-disc pl-5 space-y-1">
                  {session.ai_action_items.map((a, i) => (
                    <li key={i}>
                      {a.title}
                      {a.owner_hint && <span className="text-muted-foreground"> — {a.owner_hint}</span>}
                      {a.due_hint && <span className="text-muted-foreground"> · {a.due_hint}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className="p-5 space-y-3">
        <Label className="text-base font-medium">Attached files</Label>
        <FileUploader workspaceId={workspaceId} sessionId={session.id} />
        <FileList workspaceId={workspaceId} sessionId={session.id} />
      </Card>
    </div>
  );
}
