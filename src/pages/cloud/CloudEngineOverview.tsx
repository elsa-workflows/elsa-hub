import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Seo } from "@/components/Seo";
import { OrgCloudMembershipGate } from "@/components/cloud/CloudRedirects";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CloudActivityLog } from "@/components/cloud/CloudActivityLog";
import { CloudEngineActions } from "@/components/cloud/CloudEngineActions";
import { CloudErrorState } from "@/components/cloud/CloudErrorState";
import { CloudLinkOrganizationState } from "@/components/cloud/CloudLinkOrganizationState";
import { CloudLoadingState } from "@/components/cloud/CloudLoadingState";
import { CloudPageHeader } from "@/components/cloud/CloudPageHeader";
import { CloudProvisioningTimeline } from "@/components/cloud/CloudProvisioningTimeline";
import { CloudSetupState } from "@/components/cloud/CloudSetupState";
import { CloudUpdatingState } from "@/components/cloud/CloudUpdatingState";
import { cloudEngineStatusLabel, cloudEngineStatusVariant } from "@/components/cloud/engineStatus";
import {
  forgetControlDeletionState,
  isControlAcceptedDeletionRecord,
  readDeletionHistory,
  removeDeletionHistoryRecord,
  upsertDeletionHistoryRecord,
  upsertSubmittingDeletionRecord,
} from "@/lib/cloud/deletionHistoryStore";
import { useCloudCompatibility } from "@/hooks/useCloudCompatibility";
import { useCloudEngineLifecycle } from "@/hooks/useCloudEngineLifecycle";
import { useCloudEngineOverview } from "@/hooks/useCloudEngineOverview";
import { useCloudOrganizationLinkView } from "@/hooks/useCloudOrganizationLink";
import { useOrganizations } from "@/hooks/useOrganizations";
import { deletionCompletedAt, isCloudTerminalOperationState, isCloudUpdating, isHubOrgAdmin } from "@/lib/cloud";
import {
  CLOUD_DELETE_CONFIRMATION_INVALID_CODE,
  CLOUD_DELETE_IN_PROGRESS_CODE,
  CLOUD_LINK_CHECK_ERROR,
  CLOUD_PAGE_TITLE,
} from "@/lib/cloudClient";
import { useCloudConsolePaths } from "@/lib/cloudPaths";
import { useEffect, useRef, useState } from "react";

export default function CloudEngineOverviewPage() {
  const { engineId, slug } = useParams<{ engineId: string; slug?: string }>();
  const { pathname } = useLocation();
  const { organizations } = useOrganizations();
  const currentOrg = organizations.find((org) => org.slug === slug);
  const hubOrganizationId = currentOrg?.id;
  const navigate = useNavigate();
  const { home } = useCloudConsolePaths();
  const {
    view,
    refetch,
    setupCloud,
    setupPending,
    setupStatus,
    setupMessage,
    workspaceId,
    workspaces,
    selectWorkspace,
    selectedWorkspace,
  } = useCloudEngineOverview(engineId);
  const compatibility = useCloudCompatibility();
  const orgLink = useCloudOrganizationLinkView(hubOrganizationId, isHubOrgAdmin(currentOrg?.role));
  const showConsole = orgLink.kind === "idle" || orgLink.kind === "linked";
  const titleName = view.kind === "ready" ? view.engine.name : "Engine";
  const inDashboard = pathname.startsWith("/dashboard");
  const updating = view.kind === "updating";
  const mutationsPaused = compatibility.updating;
  const showUpdateBanner = updating || mutationsPaused;
  const updateMessage = mutationsPaused
    ? compatibility.message
    : view.kind === "updating"
    ? view.message
    : undefined;
  const engine = view.kind === "ready" ? view.engine : undefined;
  const lifecycle = useCloudEngineLifecycle(
    workspaceId,
    engineId,
    engine?.status,
    updating,
    mutationsPaused,
  );
  const showTimeline = Boolean(engine && (
    engine.status === "Provisioning"
    || engine.status === "Deleting"
    || engine.status === "RecoveryRequired"
    || engine.activeOperation?.action === "Delete"
    || engine.activeOperation?.state === "RecoveryRequired"
    || lifecycle.progress
  ));
  const overviewReason = engine
    && !showTimeline
    && engine.unavailableReason
    && engine.unavailableReasonCode !== "not-authorized"
    ? engine.unavailableReason
    : null;

  const [trackingDelete, setTrackingDelete] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function trackDelete(
    accepted: { operation: { id: string; acceptedAt?: string | null } },
    tracked: { workspaceId: string; engine: NonNullable<typeof engine> } | null,
  ) {
    try {
      const terminal = await lifecycle.pollDeleteOperation(accepted.operation.id);
      if (tracked && terminal.ok && "operation" in terminal) {
        upsertDeletionHistoryRecord(tracked.workspaceId, {
          phase: "tracking",
          instanceId: tracked.engine.id,
          instanceName: tracked.engine.name,
          operationId: terminal.operation.id ?? accepted.operation.id,
          acceptedAt: accepted.operation.acceptedAt ?? terminal.operation.acceptedAt,
          completedAt: deletionCompletedAt(terminal.operation, tracked.engine.lastOperation),
          state: terminal.operation.state,
          lastOperation: terminal.operation,
        });
      } else if (tracked) {
        forgetControlDeletionState(tracked.workspaceId, tracked.engine.id);
      }
      if (terminal.ok && "operation" in terminal && isCloudTerminalOperationState(terminal.operation.state)) {
        if (terminal.operation.state === "Succeeded" && mounted.current) navigate(home);
      }
    } catch {
      if (tracked) forgetControlDeletionState(tracked.workspaceId, tracked.engine.id);
    } finally {
      if (mounted.current) setTrackingDelete(false);
    }
  }

  function trackedDeleteRecord() {
    if (!workspaceId || !engine) return undefined;
    return readDeletionHistory(workspaceId).find((record) =>
      record.instanceId === engine.id &&
      isControlAcceptedDeletionRecord(record) &&
      !(record.state && isCloudTerminalOperationState(record.state))
    );
  }

  // Control's delete-confirmation-invalid means either "already being deleted"
  // or "confirmation expired". Decide from the engine state we have, refetching
  // the overview once when that state does not already show a delete.
  async function confirmationInvalidMeansDeleting(hadTrackedDelete: boolean): Promise<boolean> {
    if (hadTrackedDelete || trackingDelete || isDeletingEngine(engine)) return true;
    try {
      const refreshed = await refetch();
      if (hasOverviewEngine(refreshed)) return isDeletingEngine(refreshed.engine);
    } catch {
      // A failed refetch falls back to the expired-confirmation line.
    }
    return false;
  }

  async function handleDelete(
    input: { deleteConfirmationId: string; idempotencyKey: string; ifMatch: string },
  ) {
    const priorTracked = trackedDeleteRecord();
    if (workspaceId && engine) {
      upsertSubmittingDeletionRecord(workspaceId, {
        instanceId: engine.id,
        instanceName: engine.name,
      });
    }
    const accepted = await lifecycle.deleteEngine(input);
    if (isCloudUpdating(accepted) || !accepted.ok || !("operation" in accepted)) {
      if (workspaceId && engine) {
        removeDeletionHistoryRecord(workspaceId, engine.id);
        // A refused start must not drop a delete Control already accepted.
        if (priorTracked) upsertDeletionHistoryRecord(workspaceId, priorTracked);
      }
      if (!accepted.ok && "code" in accepted && accepted.code === CLOUD_DELETE_CONFIRMATION_INVALID_CODE) {
        if (await confirmationInvalidMeansDeleting(Boolean(priorTracked))) {
          return { ...accepted, code: CLOUD_DELETE_IN_PROGRESS_CODE };
        }
      }
      return accepted;
    }
    if (workspaceId && engine) {
      upsertDeletionHistoryRecord(workspaceId, {
        phase: "tracking",
        instanceId: engine.id,
        instanceName: engine.name,
        operationId: accepted.operation.id,
        acceptedAt: accepted.operation.acceptedAt,
        completedAt: deletionCompletedAt(accepted.operation, engine.lastOperation),
        state: accepted.operation.state,
        lastOperation: accepted.operation,
      });
    }
    // Control accepted the delete (202): close the dialog now and follow the
    // operation in the background. Polling failures are not start failures.
    setTrackingDelete(true);
    void Promise.resolve(refetch()).catch(() => undefined);
    void trackDelete(accepted, workspaceId && engine ? { workspaceId, engine } : null);
    return accepted;
  }

  return (
    <OrgCloudMembershipGate>
      <>
        <Seo
          path={pathname}
          title={`${titleName} — ${CLOUD_PAGE_TITLE} — Elsa Workflows`}
          description="Manage an Elsa Cloud engine."
          noIndex
        />
        <section className={inDashboard ? "p-6" : "py-10 md:py-16"}>
          <div className={inDashboard ? "space-y-6 overflow-x-hidden" : "container max-w-3xl space-y-6 overflow-x-hidden"}>
            <CloudPageHeader
              workspaces={workspaces}
              selectedWorkspace={selectedWorkspace}
              onSelectWorkspace={selectWorkspace}
            />
            <Link
              to={home}
              className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {CLOUD_PAGE_TITLE}
            </Link>

            {orgLink.kind === "pending" && <CloudLoadingState />}
            {showConsole && view.kind === "loading" && <CloudLoadingState />}
            {showConsole && showUpdateBanner && (
              <CloudUpdatingState
                message={updateMessage}
                onRetry={() => {
                  void compatibility.refetch();
                  void refetch();
                }}
              />
            )}
            {orgLink.kind === "error" && (
              <CloudErrorState message={CLOUD_LINK_CHECK_ERROR} onRetry={orgLink.refetch} />
            )}
            {view.kind === "error" && orgLink.kind !== "error" && orgLink.kind !== "needsLink" && (
              <CloudErrorState
                message={view.message}
                onRetry={() => {
                  void refetch();
                  void compatibility.refetch();
                }}
              />
            )}
            {orgLink.kind === "needsLink" && (
              <CloudLinkOrganizationState
                canLink={orgLink.canLink}
                onLink={orgLink.canLink ? () => setupCloud(hubOrganizationId) : undefined}
                onRetry={orgLink.canLink ? () => setupCloud(hubOrganizationId) : undefined}
                status={setupStatus}
                message={setupMessage}
              />
            )}
            {showConsole && view.kind === "needsSetup" && (
              <CloudSetupState
                onSetup={() => setupCloud(hubOrganizationId)}
                pending={setupPending}
              />
            )}
            {showConsole && view.kind === "missing" && (
              <p className="text-muted-foreground">This engine could not be found.</p>
            )}
            {showConsole && view.kind === "ready" && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex flex-wrap items-center gap-3">
                      <span>{view.engine.name}</span>
                      <Badge variant={cloudEngineStatusVariant(view.engine.status, view.engine.activeOperation?.state)}>
                        {cloudEngineStatusLabel(view.engine.status, view.engine.activeOperation?.state)}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className="font-medium" role="status" aria-live="polite">
                        {cloudEngineStatusLabel(view.engine.status, view.engine.activeOperation?.state)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Release</p>
                      <p className="font-medium">{view.engine.release ?? "unknown"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Slug</p>
                      <p className="font-medium">{view.engine.slug}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Health</p>
                      <p className="font-medium">{view.engine.health}</p>
                    </div>
                  </CardContent>
                </Card>

                <CloudEngineActions
                  engine={view.engine}
                  releases={lifecycle.releases}
                  disabled={updating || mutationsPaused}
                  restarting={lifecycle.restarting}
                  applying={lifecycle.applying}
                  deleting={lifecycle.deleting || trackingDelete}
                  openingStudio={lifecycle.openingStudio}
                  onRestart={lifecycle.restart}
                  onApplyRelease={lifecycle.applyRelease}
                  onConfirmDelete={lifecycle.confirmDelete}
                  onDelete={handleDelete}
                  onOpenStudio={lifecycle.openStudio}
                />

                {overviewReason && <p className="text-sm">{overviewReason}</p>}
                {showTimeline && (
                  <CloudProvisioningTimeline
                    progress={lifecycle.progress}
                    engine={view.engine}
                    onRefresh={() => {
                      void refetch();
                    }}
                  />
                )}

                <CloudActivityLog items={lifecycle.activity} />
              </>
            )}
          </div>
        </section>
      </>
    </OrgCloudMembershipGate>
  );
}

type DeleteStateEngine = { status?: string | null; activeOperation?: { action?: string | null } | null };

function isDeletingEngine(engine: DeleteStateEngine | undefined): boolean {
  if (!engine) return false;
  return engine.status === "Deleting" || engine.activeOperation?.action === "Delete";
}

function hasOverviewEngine(value: unknown): value is { ok: true; engine: DeleteStateEngine } {
  if (!value || typeof value !== "object" || !("ok" in value) || value.ok !== true) return false;
  if (!("engine" in value)) return false;
  const engine = (value as { engine: unknown }).engine;
  return Boolean(engine && typeof engine === "object" && !Array.isArray(engine));
}
