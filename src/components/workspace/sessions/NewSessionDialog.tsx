import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

interface NewSessionDialogProps {
  workspaceId: string;
  onCreated?: (s: WorkspaceSession) => void;
}

export function NewSessionDialog({ workspaceId, onCreated }: NewSessionDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [sessionType, setSessionType] = useState<SessionType>("call");
  const [occurredAt, setOccurredAt] = useState(
    () => new Date().toISOString().slice(0, 16),
  );
  const [duration, setDuration] = useState<string>("30");
  const [participants, setParticipants] = useState("");
  const [notes, setNotes] = useState("");

  const { create } = useWorkspaceSessions(workspaceId);

  const reset = () => {
    setTitle("");
    setSessionType("call");
    setOccurredAt(new Date().toISOString().slice(0, 16));
    setDuration("30");
    setParticipants("");
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    try {
      const row = await create.mutateAsync({
        title: title.trim(),
        session_type: sessionType,
        occurred_at: new Date(occurredAt).toISOString(),
        duration_minutes: duration ? parseInt(duration, 10) : null,
        participants: participants
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
        notes_markdown: notes,
      });
      toast({ title: "Session created" });
      onCreated?.(row);
      reset();
      setOpen(false);
    } catch (err: any) {
      toast({
        title: "Could not create session",
        description: err?.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New session
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record a session</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Discovery call with Acme"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select
                value={sessionType}
                onValueChange={(v) => setSessionType(v as SessionType)}
              >
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
              <Label htmlFor="duration">Duration (min)</Label>
              <Input
                id="duration"
                type="number"
                min={1}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="occurred">When</Label>
            <Input
              id="occurred"
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="participants">Participants (comma-separated)</Label>
            <Input
              id="participants"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              placeholder="Jane Doe, John Smith"
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Topics, decisions, anything worth remembering…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
