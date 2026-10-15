import { Link } from "react-router-dom";
import { ArrowRight, Cloud } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CloudErrorState } from "@/components/cloud/CloudErrorState";
import { CloudUpdatingState } from "@/components/cloud/CloudUpdatingState";
import { cloudEngineStatusVariant } from "@/components/cloud/engineStatus";
import { useCloudEngines } from "@/hooks/useCloudEngines";
import {
  CLOUD_EMPTY_MESSAGE,
  CLOUD_OPEN_LINK,
  CLOUD_PAGE_TITLE,
  cloudEngineCountLabel,
} from "@/lib/cloudClient";
import { dashboardCloudHomePath } from "@/lib/cloudPaths";

export function ElsaCloudOverviewCard({ orgSlug }: { orgSlug?: string | null }) {
  const { view, refetch } = useCloudEngines();
  const href = dashboardCloudHomePath(orgSlug);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            {CLOUD_PAGE_TITLE}
          </span>
          <Link
            to={href}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {CLOUD_OPEN_LINK}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {view.kind === "loading" && (
          <div className="h-6 w-24 animate-pulse rounded bg-muted" />
        )}
        {view.kind === "updating" && <CloudUpdatingState message={view.message} />}
        {view.kind === "error" && (
          <CloudErrorState message={view.message} onRetry={() => void refetch()} />
        )}
        {(view.kind === "needsSetup" || view.kind === "empty") && (
          <p className="text-sm text-muted-foreground">{CLOUD_EMPTY_MESSAGE}</p>
        )}
        {view.kind === "list" && (
          <div className="space-y-2">
            <p className="text-sm font-medium">{cloudEngineCountLabel(view.engines.length)}</p>
            <ul className="space-y-1.5">
              {view.engines.slice(0, 3).map((engine) => (
                <li key={engine.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{engine.name}</span>
                  <Badge variant={cloudEngineStatusVariant(engine.status)}>{engine.status}</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
