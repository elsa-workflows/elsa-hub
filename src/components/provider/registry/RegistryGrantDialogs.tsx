import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function toIso(dateInput: string): string {
  return new Date(`${dateInput}T00:00:00Z`).toISOString();
}

interface RecordIssuedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationName: string;
  /** Subscription period end, used to pre-fill the token expiry so the two stay aligned. */
  periodEnd: string | null;
  isSaving?: boolean;
  onSave: (values: {
    registry_token_name: string;
    scope_map_name: string;
    token_expires_at: string;
    notes: string | null;
  }) => void;
}

export function RecordIssuedDialog({
  open,
  onOpenChange,
  organizationName,
  periodEnd,
  isSaving,
  onSave,
}: RecordIssuedDialogProps) {
  const [tokenName, setTokenName] = useState("");
  const [scopeMap, setScopeMap] = useState("subscriber-pull");
  const [expiry, setExpiry] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setTokenName("");
      setScopeMap("subscriber-pull");
      setExpiry(toDateInput(periodEnd));
      setNotes("");
    }
  }, [open, periodEnd]);

  const canSave = tokenName.trim() && scopeMap.trim() && expiry;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record issued token</DialogTitle>
          <DialogDescription>
            Create the token in the container registry first, then record it here for{" "}
            <span className="font-medium text-foreground">{organizationName}</span>. This page keeps
            the record only — never paste the token password anywhere in this app.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token-name">Registry token name</Label>
            <Input
              id="token-name"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              placeholder="acme-corp-pull"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              The token's name in the registry — not its password.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scope-map">Scope map name</Label>
            <Input
              id="scope-map"
              value={scopeMap}
              onChange={(e) => setScopeMap(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="token-expiry">Token expiry date</Label>
            <Input
              id="token-expiry"
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Pre-filled with the subscription's period end. Keeping them aligned avoids drift.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="grant-notes">Notes (optional)</Label>
            <Textarea
              id="grant-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Anything worth remembering about this grant."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!canSave || isSaving}
            onClick={() =>
              onSave({
                registry_token_name: tokenName.trim(),
                scope_map_name: scopeMap.trim(),
                token_expires_at: toIso(expiry),
                notes: notes.trim() || null,
              })
            }
          >
            Save record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface MarkRevokedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationName: string;
  tokenName: string | null;
  isSaving?: boolean;
  onSave: (reason: string) => void;
}

export function MarkRevokedDialog({
  open,
  onOpenChange,
  organizationName,
  tokenName,
  isSaving,
  onSave,
}: MarkRevokedDialogProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark revoked</DialogTitle>
          <DialogDescription>
            Records that access for{" "}
            <span className="font-medium text-foreground">{organizationName}</span>
            {tokenName ? ` (${tokenName})` : ""} has been removed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 rounded-md border border-border bg-muted/40 p-3 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
          <p className="text-muted-foreground">
            This does not revoke anything in the container registry. Delete the token there first —
            this only records that you did.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="revoke-reason">Reason</Label>
          <Input
            id="revoke-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Subscription canceled"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim() || isSaving}
            onClick={() => onSave(reason.trim())}
          >
            Mark revoked
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface UpdateExpiryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentExpiry: string | null;
  suggestedExpiry?: string | null;
  isSaving?: boolean;
  onSave: (isoDate: string) => void;
}

export function UpdateExpiryDialog({
  open,
  onOpenChange,
  currentExpiry,
  suggestedExpiry,
  isSaving,
  onSave,
}: UpdateExpiryDialogProps) {
  const [expiry, setExpiry] = useState("");

  useEffect(() => {
    if (open) setExpiry(toDateInput(suggestedExpiry ?? currentExpiry));
  }, [open, currentExpiry, suggestedExpiry]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update expiry</DialogTitle>
          <DialogDescription>
            Record the token's expiry as set in the registry. Change it there first.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="new-expiry">Token expiry date</Label>
          <Input
            id="new-expiry"
            type="date"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          />
          {suggestedExpiry && (
            <p className="text-xs text-muted-foreground">
              Suggested: the subscription's period end.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!expiry || isSaving} onClick={() => onSave(toIso(expiry))}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
