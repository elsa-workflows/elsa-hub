import { Seo } from "@/components/Seo";
import { CloudEmptyState } from "@/components/cloud/CloudEmptyState";
import { CloudEngineList } from "@/components/cloud/CloudEngineList";
import { CloudErrorState } from "@/components/cloud/CloudErrorState";
import { CloudLoadingState } from "@/components/cloud/CloudLoadingState";
import { CloudSetupState } from "@/components/cloud/CloudSetupState";
import { CloudUpdatingState } from "@/components/cloud/CloudUpdatingState";
import { useCloudEngines } from "@/hooks/useCloudEngines";

export default function CloudHome() {
  const { view, refetch, setupCloud, setupPending } = useCloudEngines();

  return (
    <>
      <Seo
        path="/cloud"
        title="Cloud — Elsa Workflows"
        description="View your Elsa Cloud engines."
        noIndex
      />
      <section className="py-10 md:py-16">
        <div className="container max-w-3xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cloud</h1>
            <p className="mt-2 text-muted-foreground">
              A read-only list of your Elsa Cloud engines.
            </p>
          </div>

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
  );
}
