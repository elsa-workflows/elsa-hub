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
import { CLOUD_LINK_CHECK_ERROR, CLOUD_PAGE_TITLE } from "@/lib/cloudClient";
import { useCloudConsolePaths } from "@/lib/cloudPaths";

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

  async function handleDelete(
    input: { deleteConfirmationId: string; idempotencyKey: string; ifMatch: string },
  ) {
    if (workspaceId && engine) {
      upsertSubmittingDeletionRecord(workspaceId, {
        instanceId: engine.id,
        instanceName: engine.name,
      });
    }
    const accepted = await lifecycle.deleteEngine(input);
    if (isCloudUpdating(accepted) || !accepted.ok || !("operation" in accepted)) {
      if (workspaceId && engine) removeDeletionHistoryRecord(workspaceId, engine.id);
      return accepted;
    }
    if (workspaceId && engine) {
      upsertDeletionHistoryRecord(workspaceId, {
        phase: "tracking",
        instanceId: engine.id,
        instanceName: engine.name,
        acceptedAt: accepted.operation.acceptedAt,
        completedAt: deletionCompletedAt(accepted.operation, engine.lastOperation),
        state: accepted.operation.state,
        lastOperation: accepted.operation,
      });
    }
    const terminal = await lifecycle.pollDeleteOperation(accepted.operation.id);
    if (workspaceId && engine && terminal.ok && "operation" in terminal) {
      upsertDeletionHistoryRecord(workspaceId, {
        phase: "tracking",
        instanceId: engine.id,
        instanceName: engine.name,
        acceptedAt: accepted.operation.acceptedAt ?? terminal.operation.acceptedAt,
        completedAt: deletionCompletedAt(terminal.operation, engine.lastOperation),
        state: terminal.operation.state,
        lastOperation: terminal.operation,
      });
    }
    if (terminal.ok && "operation" in terminal && isCloudTerminalOperationState(terminal.operation.state)) {
      if (terminal.operation.state === "Succeeded") navigate(home);
    }
    // After Control accepts the delete, polling failures are not start failures.
    return terminal.ok ? terminal : accepted;
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
                  deleting={lifecycle.deleting}
                  openingStudio={lifecycle.openingStudio}
                  onRestart={lifecycle.restart}
                  onApplyRelease={lifecycle.applyRelease}
                  onConfirmDelete={lifecycle.confirmDelete}
                  onDelete={handleDelete}
                  onOpenStudio={lifecycle.openStudio}
                />

                {(view.engine.status === "Provisioning" ||
                  view.engine.status === "Deleting" ||
                  view.engine.status === "RecoveryRequired" ||
                  view.engine.activeOperation?.action === "Delete" ||
                  view.engine.activeOperation?.state === "RecoveryRequired" ||
                  lifecycle.progress) && (
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
