import { useLocation } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { OrgCloudMembershipGate } from "@/components/cloud/CloudRedirects";
import { CloudEmptyState } from "@/components/cloud/CloudEmptyState";
import { CloudEngineList } from "@/components/cloud/CloudEngineList";
import { CloudErrorState } from "@/components/cloud/CloudErrorState";
import { CloudLoadingState } from "@/components/cloud/CloudLoadingState";
import { CloudPageHeader } from "@/components/cloud/CloudPageHeader";
import { CloudSetupState } from "@/components/cloud/CloudSetupState";
import { CloudUpdatingState } from "@/components/cloud/CloudUpdatingState";
import { useCloudEngines } from "@/hooks/useCloudEngines";
import { CLOUD_ENGINES_INTRO, CLOUD_PAGE_TITLE } from "@/lib/cloudClient";

export default function CloudHome() {
  const { pathname } = useLocation();
  const { view, refetch, setupCloud, setupPending, workspaces, selectWorkspace, selectedWorkspace } =
    useCloudEngines();
  const inDashboard = pathname.startsWith("/dashboard");

  return (
    <OrgCloudMembershipGate>
      <>
        <Seo
          path={pathname}
          title={`${CLOUD_PAGE_TITLE} — Elsa Workflows`}
          description="View your Elsa Cloud engines."
          noIndex
        />
        <section className={inDashboard ? "p-6" : "py-10 md:py-16"}>
          <div className={inDashboard ? "space-y-6" : "container max-w-3xl space-y-6"}>
            <CloudPageHeader
              description={CLOUD_ENGINES_INTRO}
              workspaces={workspaces}
              selectedWorkspace={selectedWorkspace}
              onSelectWorkspace={selectWorkspace}
            />

            {view.kind === "loading" && <CloudLoadingState />}
            {view.kind === "updating" && <CloudUpdatingState message={view.message} />}
            {view.kind === "error" && (
              <CloudErrorState message={view.message} onRetry={() => void refetch()} />
            )}
            {view.kind === "needsSetup" && (
              <CloudSetupState onSetup={setupCloud} pending={setupPending} />
            )}
            {view.kind === "empty" && <CloudEmptyState />}
            {view.kind === "list" && <CloudEngineList engines={view.engines} />}
          </div>
        </section>
      </>
    </OrgCloudMembershipGate>
  );
}
