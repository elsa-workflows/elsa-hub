import { useLocation, useParams } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { CloudCreateEngineDialog } from "@/components/cloud/CloudCreateEngineDialog";
import { CloudLinkOrganizationState } from "@/components/cloud/CloudLinkOrganizationState";
import { OrgCloudMembershipGate } from "@/components/cloud/CloudRedirects";
import { CloudEmptyState } from "@/components/cloud/CloudEmptyState";
import { CloudEngineList } from "@/components/cloud/CloudEngineList";
import { CloudErrorState } from "@/components/cloud/CloudErrorState";
import { CloudLoadingState } from "@/components/cloud/CloudLoadingState";
import { CloudPageHeader } from "@/components/cloud/CloudPageHeader";
import { CloudSetupState } from "@/components/cloud/CloudSetupState";
import { CloudUpdatingState } from "@/components/cloud/CloudUpdatingState";
import { useCloudEngines } from "@/hooks/useCloudEngines";
import { useCloudOrganizationLinkView } from "@/hooks/useCloudOrganizationLink";
import { useOrganizations } from "@/hooks/useOrganizations";
import { isHubOrgAdmin } from "@/lib/cloud";
import { CLOUD_ENGINES_INTRO, CLOUD_LIMIT_MESSAGE, CLOUD_PAGE_TITLE } from "@/lib/cloudClient";

export default function CloudHome() {
  const { pathname } = useLocation();
  const { slug } = useParams<{ slug?: string }>();
  const { organizations } = useOrganizations();
  const currentOrg = organizations.find((org) => org.slug === slug);
  const hubOrganizationId = currentOrg?.id;
  const {
    view,
    refetch,
    setupCloud,
    setupPending,
    options,
    atLimit,
    canCreate,
    createEngine,
    creating,
    workspaces,
    selectWorkspace,
    selectedWorkspace,
  } = useCloudEngines();
  const orgLink = useCloudOrganizationLinkView(hubOrganizationId, isHubOrgAdmin(currentOrg?.role));
  const inDashboard = pathname.startsWith("/dashboard");
  const updating = view.kind === "updating";
  const showConsole = orgLink.kind === "idle" || orgLink.kind === "linked";
  const createAction = showConsole && canCreate && options
    ? (
      <CloudCreateEngineDialog
        options={options}
        disabled={updating}
        creating={creating}
        onCreate={createEngine}
      />
    )
    : null;

  return (
    <OrgCloudMembershipGate>
      <>
        <Seo
          path={pathname}
          title={`${CLOUD_PAGE_TITLE} — Elsa Workflows`}
          description="Create and manage your Elsa Cloud engines."
          noIndex
        />
        <section className={inDashboard ? "p-6" : "py-10 md:py-16"}>
          <div className={inDashboard ? "space-y-6 overflow-x-hidden" : "container max-w-3xl space-y-6 overflow-x-hidden"}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <CloudPageHeader
                description={CLOUD_ENGINES_INTRO}
                workspaces={workspaces}
                selectedWorkspace={selectedWorkspace}
                onSelectWorkspace={selectWorkspace}
              />
              {view.kind === "list" && createAction}
            </div>

            {atLimit && (
              <p className="rounded-lg border px-3 py-3 text-sm">{CLOUD_LIMIT_MESSAGE}</p>
            )}

            {orgLink.kind === "pending" && <CloudLoadingState />}
            {showConsole && view.kind === "loading" && <CloudLoadingState />}
            {showConsole && view.kind === "updating" && <CloudUpdatingState message={view.message} />}
            {view.kind === "error" && (
              <CloudErrorState message={view.message} onRetry={() => void refetch()} />
            )}
            {orgLink.kind === "needsLink" && view.kind !== "error" && (
              <CloudLinkOrganizationState
                canLink={orgLink.canLink}
                onLink={orgLink.canLink ? () => setupCloud(hubOrganizationId) : undefined}
                pending={setupPending}
              />
            )}
            {showConsole && view.kind === "needsSetup" && (
              <CloudSetupState
                onSetup={() => setupCloud(hubOrganizationId)}
                pending={setupPending}
              />
            )}
            {showConsole && view.kind === "empty" && <CloudEmptyState action={createAction} />}
            {showConsole && view.kind === "list" && <CloudEngineList engines={view.engines} />}
          </div>
        </section>
      </>
    </OrgCloudMembershipGate>
  );
}
