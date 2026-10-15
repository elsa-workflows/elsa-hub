import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Seo } from "@/components/Seo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CloudErrorState } from "@/components/cloud/CloudErrorState";
import { CloudLoadingState } from "@/components/cloud/CloudLoadingState";
import { CloudSetupState } from "@/components/cloud/CloudSetupState";
import { CloudUpdatingState } from "@/components/cloud/CloudUpdatingState";
import { cloudEngineStatusVariant } from "@/components/cloud/engineStatus";
import { useCloudEngineOverview } from "@/hooks/useCloudEngineOverview";

export default function CloudEngineOverviewPage() {
  const { engineId } = useParams<{ engineId: string }>();
  const { view, refetch, setupCloud, setupPending } = useCloudEngineOverview(engineId);
  const titleName = view.kind === "ready" ? view.engine.name : "Engine";

  return (
    <>
      <Seo
        path={`/cloud/engines/${engineId ?? ""}`}
        title={`${titleName} — Cloud — Elsa Workflows`}
        description="Read-only overview of an Elsa Cloud engine."
        noIndex
      />
      <section className="py-10 md:py-16">
        <div className="container max-w-3xl space-y-6">
          <Link
            to="/cloud"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Cloud
          </Link>

          {view.kind === "loading" && <CloudLoadingState />}
          {view.kind === "updating" && <CloudUpdatingState message={view.message} />}
          {view.kind === "error" && (
            <CloudErrorState message={view.message} onRetry={() => void refetch()} />
          )}
          {view.kind === "needsSetup" && (
            <CloudSetupState onSetup={setupCloud} pending={setupPending} />
          )}
          {view.kind === "missing" && (
            <p className="text-muted-foreground">This engine could not be found.</p>
          )}
          {view.kind === "ready" && (
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
          )}
        </div>
      </section>
    </>
  );
}
