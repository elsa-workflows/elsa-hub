import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  useWorkspaceSessions,
  type SessionType,
  type WorkspaceSession,
} from "@/hooks/useWorkspaceSessions";

interface EditSessionDialogProps {
  workspaceId: string;
  session: WorkspaceSession;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export function EditSessionDialog({
  workspaceId,
  session,
  open,
  onOpenChange,
}: EditSessionDialogProps) {
  const { update } = useWorkspaceSessions(workspaceId);
  const [title, setTitle] = useState(session.title);
  const [sessionType, setSessionType] = useState<SessionType>(session.session_type);
  const [occurredAt, setOccurredAt] = useState(() => toLocalInput(session.occurred_at));
  const [duration, setDuration] = useState(
    session.duration_minutes != null ? String(session.duration_minutes) : "",
  );
  const [participants, setParticipants] = useState(session.participants.join(", "));

  useEffect(() => {
    if (!open) return;
    setTitle(session.title);
    setSessionType(session.session_type);
    setOccurredAt(toLocalInput(session.occurred_at));
    setDuration(session.duration_minutes != null ? String(session.duration_minutes) : "");
    setParticipants(session.participants.join(", "));
  }, [open, session]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    try {
      await update.mutateAsync({
        id: session.id,
        patch: {
          title: title.trim(),
          session_type: sessionType,
          occurred_at: new Date(occurredAt).toISOString(),
          duration_minutes: duration ? parseInt(duration, 10) : null,
          participants: participants
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean),
        },
      });
      toast({ title: "Session updated" });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Update failed", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit session details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-title">Title</Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={sessionType} onValueChange={(v) => setSessionType(v as SessionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="async_review">Async review</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-duration">Duration (min)</Label>
              <Input
                id="edit-duration"
                type="number"
                min={1}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="edit-occurred">When</Label>
            <Input
              id="edit-occurred"
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="edit-participants">Participants (comma-separated)</Label>
            <Input
              id="edit-participants"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              placeholder="Jane Doe, John Smith"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={update.isPending}>
            {update.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
