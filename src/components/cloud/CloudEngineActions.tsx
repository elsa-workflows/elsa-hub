import { useState, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CLOUD_TAP_TARGET } from "@/lib/cloud/actionClass";
import { createCloudPkcePair, submitStudioHandoff } from "@/lib/cloud";
import {
  CLOUD_APPLY_RELEASE,
  CLOUD_DELETE_CONFIRM,
  CLOUD_DELETE_ENGINE,
  CLOUD_OPEN_STUDIO,
  CLOUD_RESTART,
  CLOUD_RESTART_CONFIRM,
  CLOUD_STRUCTURED_LOGS,
  type CloudAvailableRelease,
  type CloudDeleteConfirmation,
  type CloudEngineOverview,
} from "@/lib/cloudClient";
import { cn } from "@/lib/utils";

function resultError(result: unknown): string | null {
  if (!result || typeof result !== "object" || !("ok" in result) || result.ok) {
    return null;
  }
  if ("error" in result && typeof result.error === "string" && result.error) {
    return result.error;
  }
  return "That action could not be completed.";
}

export function CloudEngineActions({
  engine,
  releases,
  disabled,
  restarting,
  applying,
  deleting,
  openingStudio,
  onRestart,
  onApplyRelease,
  onConfirmDelete,
  onDelete,
  onOpenStudio,
}: {
  engine: CloudEngineOverview;
  releases: CloudAvailableRelease[];
  disabled: boolean;
  restarting: boolean;
  applying: boolean;
  deleting: boolean;
  openingStudio: boolean;
  onRestart: (input: { idempotencyKey: string; ifMatch: string }) => Promise<unknown>;
  onApplyRelease: (input: {
    version: string;
    idempotencyKey: string;
    ifMatch: string;
  }) => Promise<unknown>;
  onConfirmDelete: () => Promise<unknown>;
  onDelete: (input: {
    deleteConfirmationId: string;
    idempotencyKey: string;
    ifMatch: string;
  }) => Promise<unknown>;
  onOpenStudio: (input: {
    organizationId: string;
    audience: string;
    redirectUri: string;
    codeChallenge: string;
  }) => Promise<unknown>;
}) {
  const [restartOpen, setRestartOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState(releases[0]?.version ?? "");
  const [confirmation, setConfirmation] = useState<CloudDeleteConfirmation | null>(null);
  const [restartError, setRestartError] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const ifMatch = engine.etag ?? (engine.version !== null ? `"${engine.version}"` : "");
  const canRestart = engine.allowedActions.restart.allowed && !disabled && Boolean(ifMatch);
  const canApply = engine.allowedActions.applyRelease.allowed && !disabled && Boolean(ifMatch) && releases.length > 0;
  const canOpen = engine.allowedActions.open.allowed &&
    !disabled &&
    Boolean(engine.organizationId && engine.audience && engine.redirectUri);
  const canDelete = engine.allowedActions.delete.allowed && !disabled && Boolean(ifMatch);

  async function restart(event: MouseEvent) {
    event.preventDefault();
    if (!canRestart) return;
    setRestartError(null);
    const error = resultError(await onRestart({ idempotencyKey: crypto.randomUUID(), ifMatch }));
    if (error) {
      setRestartError(error);
      return;
    }
    setRestartOpen(false);
  }

  async function apply(event: MouseEvent) {
    event.preventDefault();
    if (!canApply || !selectedRelease) return;
    setApplyError(null);
    const error = resultError(await onApplyRelease({
      version: selectedRelease,
      idempotencyKey: crypto.randomUUID(),
      ifMatch,
    }));
    if (error) {
      setApplyError(error);
      return;
    }
    setApplyOpen(false);
  }

  async function startDelete() {
    if (!canDelete) return;
    setDeleteError(null);
    setConfirmation(null);
    setDeleteOpen(true);
    const result = await onConfirmDelete();
    const error = resultError(result);
    if (error) {
      setDeleteError(error);
      return;
    }
    if (result && typeof result === "object" && "ok" in result && result.ok && "confirmation" in result) {
      setConfirmation((result as { confirmation: CloudDeleteConfirmation }).confirmation);
    }
  }

  async function finishDelete(event: MouseEvent) {
    event.preventDefault();
    if (!confirmation || !canDelete) return;
    setDeleteError(null);
    const error = resultError(await onDelete({
      deleteConfirmationId: confirmation.id,
      idempotencyKey: crypto.randomUUID(),
      ifMatch,
    }));
    if (error) {
      setDeleteError(error);
      return;
    }
    setDeleteOpen(false);
  }

  async function openStudio() {
    if (!canOpen || !engine.organizationId || !engine.audience || !engine.redirectUri) return;
    const pkce = await createCloudPkcePair();
    const result = await onOpenStudio({
      organizationId: engine.organizationId,
      audience: engine.audience,
      redirectUri: engine.redirectUri,
      codeChallenge: pkce.challenge,
    });
    if (result && typeof result === "object" && "ok" in result && result.ok && "handoff" in result) {
      submitStudioHandoff((result as { handoff: Parameters<typeof submitStudioHandoff>[0] }).handoff, pkce.verifier);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        className={cn(CLOUD_TAP_TARGET)}
        disabled={!canOpen || openingStudio}
        onClick={() => void openStudio()}
      >
        {CLOUD_OPEN_STUDIO}
      </Button>
      <Button
        variant="outline"
        className={cn(CLOUD_TAP_TARGET)}
        asChild
      >
        <a href="#structured-logs">{CLOUD_STRUCTURED_LOGS}</a>
      </Button>
      <Button
        variant="outline"
        className={cn(CLOUD_TAP_TARGET)}
        disabled={!canRestart || restarting}
        onClick={() => {
          setRestartError(null);
          setRestartOpen(true);
        }}
      >
        {CLOUD_RESTART}
      </Button>
      <Button
        variant="outline"
        className={cn(CLOUD_TAP_TARGET)}
        disabled={!canApply || applying}
        onClick={() => {
          setSelectedRelease(releases[0]?.version ?? "");
          setApplyError(null);
          setApplyOpen(true);
        }}
      >
        {CLOUD_APPLY_RELEASE}
      </Button>
      <Button
        variant="destructive"
        className={cn(CLOUD_TAP_TARGET)}
        disabled={!canDelete || deleting}
        onClick={() => void startDelete()}
      >
        {CLOUD_DELETE_ENGINE}
      </Button>

      <AlertDialog
        open={restartOpen}
        onOpenChange={(open) => {
          if (!open && restarting) return;
          setRestartOpen(open);
          if (!open) setRestartError(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{CLOUD_RESTART_CONFIRM}</AlertDialogTitle>
            {restartError && <AlertDialogDescription>{restartError}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={CLOUD_TAP_TARGET} disabled={restarting}>Cancel</AlertDialogCancel>
            <AlertDialogAction className={CLOUD_TAP_TARGET} disabled={restarting} onClick={(event) => void restart(event)}>
              {CLOUD_RESTART}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={applyOpen}
        onOpenChange={(open) => {
          if (!open && applying) return;
          setApplyOpen(open);
          if (!open) setApplyError(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{CLOUD_APPLY_RELEASE}</AlertDialogTitle>
            {applyError && <AlertDialogDescription>{applyError}</AlertDialogDescription>}
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cloud-release">{CLOUD_APPLY_RELEASE}</Label>
            <Select value={selectedRelease} onValueChange={setSelectedRelease}>
              <SelectTrigger id="cloud-release" className={CLOUD_TAP_TARGET}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {releases.map((release) => (
                  <SelectItem key={release.version} value={release.version}>
                    {release.version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className={CLOUD_TAP_TARGET} disabled={applying}>Cancel</AlertDialogCancel>
            <AlertDialogAction className={CLOUD_TAP_TARGET} disabled={applying} onClick={(event) => void apply(event)}>
              {CLOUD_APPLY_RELEASE}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open && deleting) return;
          setDeleteOpen(open);
          if (!open) {
            setDeleteError(null);
            setConfirmation(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{CLOUD_DELETE_CONFIRM}</AlertDialogTitle>
            {confirmation?.billingNotice && (
              <AlertDialogDescription>{confirmation.billingNotice.message}</AlertDialogDescription>
            )}
            {deleteError && <AlertDialogDescription>{deleteError}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={CLOUD_TAP_TARGET} disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(CLOUD_TAP_TARGET, "bg-destructive text-destructive-foreground")}
              disabled={deleting || !confirmation}
              onClick={(event) => void finishDelete(event)}
            >
              {CLOUD_DELETE_ENGINE}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
