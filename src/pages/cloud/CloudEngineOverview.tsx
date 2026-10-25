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
import { cloudEngineStatusVariant } from "@/components/cloud/engineStatus";
import { useCloudEngineLifecycle } from "@/hooks/useCloudEngineLifecycle";
import { useCloudEngineOverview } from "@/hooks/useCloudEngineOverview";
import { useCloudOrganizationLinkView } from "@/hooks/useCloudOrganizationLink";
import { useOrganizations } from "@/hooks/useOrganizations";
import { isCloudTerminalOperationState, isCloudUpdating, isHubOrgAdmin } from "@/lib/cloud";
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
  const orgLink = useCloudOrganizationLinkView(hubOrganizationId, isHubOrgAdmin(currentOrg?.role));
  const showConsole = orgLink.kind === "idle" || orgLink.kind === "linked";
  const titleName = view.kind === "ready" ? view.engine.name : "Engine";
  const inDashboard = pathname.startsWith("/dashboard");
  const updating = view.kind === "updating";
  const engine = view.kind === "ready" ? view.engine : undefined;
  const lifecycle = useCloudEngineLifecycle(
    workspaceId,
    engineId,
    engine?.status,
    updating,
  );

  async function handleDelete(
    input: { deleteConfirmationId: string; idempotencyKey: string; ifMatch: string },
  ) {
    const accepted = await lifecycle.deleteEngine(input);
    if (isCloudUpdating(accepted) || !accepted.ok || !("operation" in accepted)) {
      return accepted;
    }
    const terminal = await lifecycle.pollDeleteOperation(accepted.operation.id);
    if (terminal.ok && "operation" in terminal && isCloudTerminalOperationState(terminal.operation.state)) {
      navigate(home);
    }
    return terminal;
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
            {showConsole && view.kind === "updating" && <CloudUpdatingState message={view.message} />}
            {orgLink.kind === "error" && (
              <CloudErrorState message={CLOUD_LINK_CHECK_ERROR} onRetry={orgLink.refetch} />
            )}
            {view.kind === "error" && orgLink.kind !== "error" && orgLink.kind !== "needsLink" && (
              <CloudErrorState message={view.message} onRetry={() => void refetch()} />
            )}
            {orgLink.kind === "needsLink" && (
              <CloudLinkOrganizationState
                canLink={orgLink.canLink}
                onLink={orgLink.canLink ? () => setupCloud(hubOrganizationId) : undefined}
                onRetry={orgLink.canLink ? () => setupCloud(hubOrganizationId) : undefined}
                pending={setupPending}
                status={setupStatus === "success" ? "idle" : setupStatus}
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
                      <Badge variant={cloudEngineStatusVariant(view.engine.status)}>
                        {view.engine.status}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className="font-medium">{view.engine.status}</p>
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
                  disabled={updating}
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

                {(view.engine.status === "Provisioning" || lifecycle.progress) && (
                  <CloudProvisioningTimeline progress={lifecycle.progress} />
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
