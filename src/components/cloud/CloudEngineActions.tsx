import { useState } from "react";
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
  isCloudUpdating,
  type CloudAvailableRelease,
  type CloudDeleteConfirmation,
  type CloudEngineOverview,
} from "@/lib/cloudClient";
import { cn } from "@/lib/utils";

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
  const ifMatch = engine.etag ?? (engine.version !== null ? `"${engine.version}"` : "");
  const canRestart = engine.allowedActions.restart.allowed && !disabled && Boolean(ifMatch);
  const canApply = engine.allowedActions.applyRelease.allowed && !disabled && Boolean(ifMatch) && releases.length > 0;
  const canOpen = (engine.canOpen || engine.allowedActions.open.allowed) &&
    !disabled &&
    Boolean(engine.organizationId && engine.audience && engine.redirectUri);
  const canDelete = !disabled && Boolean(ifMatch);

  async function restart() {
    if (!canRestart) return;
    await onRestart({ idempotencyKey: crypto.randomUUID(), ifMatch });
    setRestartOpen(false);
  }

  async function apply() {
    if (!canApply || !selectedRelease) return;
    await onApplyRelease({
      version: selectedRelease,
      idempotencyKey: crypto.randomUUID(),
      ifMatch,
    });
    setApplyOpen(false);
  }

  async function startDelete() {
    if (!canDelete) return;
    const result = await onConfirmDelete();
    if (isCloudUpdating(result as never)) return;
    if (result && typeof result === "object" && "ok" in result && result.ok && "confirmation" in result) {
      setConfirmation((result as { confirmation: CloudDeleteConfirmation }).confirmation);
      setDeleteOpen(true);
    }
  }

  async function finishDelete() {
    if (!confirmation || !canDelete) return;
    await onDelete({
      deleteConfirmationId: confirmation.id,
      idempotencyKey: crypto.randomUUID(),
      ifMatch,
    });
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
        onClick={() => setRestartOpen(true)}
      >
        {CLOUD_RESTART}
      </Button>
      <Button
        variant="outline"
        className={cn(CLOUD_TAP_TARGET)}
        disabled={!canApply || applying}
        onClick={() => {
          setSelectedRelease(releases[0]?.version ?? "");
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

      <AlertDialog open={restartOpen} onOpenChange={setRestartOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{CLOUD_RESTART_CONFIRM}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={CLOUD_TAP_TARGET}>Cancel</AlertDialogCancel>
            <AlertDialogAction className={CLOUD_TAP_TARGET} onClick={() => void restart()}>
              {CLOUD_RESTART}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={applyOpen} onOpenChange={setApplyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{CLOUD_APPLY_RELEASE}</AlertDialogTitle>
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
            <AlertDialogCancel className={CLOUD_TAP_TARGET}>Cancel</AlertDialogCancel>
            <AlertDialogAction className={CLOUD_TAP_TARGET} onClick={() => void apply()}>
              {CLOUD_APPLY_RELEASE}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{CLOUD_DELETE_CONFIRM}</AlertDialogTitle>
            {confirmation?.billingNotice && (
              <AlertDialogDescription>{confirmation.billingNotice.message}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={CLOUD_TAP_TARGET}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(CLOUD_TAP_TARGET, "bg-destructive text-destructive-foreground")}
              onClick={() => void finishDelete()}
            >
              {CLOUD_DELETE_ENGINE}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
