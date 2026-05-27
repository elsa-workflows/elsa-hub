import { Link, useParams } from "react-router-dom";
import { Building2, ArrowRight, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useProviderDashboard } from "@/hooks/useProviderDashboard";
import { useProviderWorkspaceList } from "@/hooks/useEngagementWorkspace";

export default function ProviderWorkspaces() {
  const { slug } = useParams<{ slug: string }>();
  const { provider } = useProviderDashboard(slug);
  const { data: orgs, isLoading } = useProviderWorkspaceList(provider?.id);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Workspaces</h1>
        <p className="text-muted-foreground mt-1">
          Shared spaces with each customer. Drop in transcripts, briefs, and recordings — the customer sees what you see.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-muted/40 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : !orgs || orgs.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Layers className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium">No customers yet</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {orgs.map((o) => (
            <Link
              key={o.organization_id}
              to={`/dashboard/provider/${slug}/workspaces/${o.organization_slug}`}
              className="block"
            >
              <Card className="hover:border-primary transition-colors">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center overflow-hidden">
                    {o.organization_logo_url ? (
                      <img src={o.organization_logo_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{o.organization_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.workspace_id ? "Workspace open" : "Tap to open workspace"}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
