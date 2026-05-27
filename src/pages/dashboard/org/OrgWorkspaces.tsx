import { Link, useParams } from "react-router-dom";
import { Building2, ArrowRight, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useOrgWorkspaceList } from "@/hooks/useEngagementWorkspace";

export default function OrgWorkspaces() {
  const { slug } = useParams<{ slug: string }>();
  const { data: orgs } = useOrganizations();
  const organization = orgs?.find((o) => o.slug === slug);
  const { data: providers, isLoading } = useOrgWorkspaceList(organization?.id);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Workspaces</h1>
        <p className="text-muted-foreground mt-1">
          Shared spaces with each of your service providers. Files, transcripts, and decisions live here — visible to both sides.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-muted/40 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : !providers || providers.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Layers className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium">No engagements yet</p>
          <p className="text-xs mt-1">
            A workspace opens automatically once you start working with a service provider.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {providers.map((p) => (
            <Link
              key={p.provider_id}
              to={`/dashboard/org/${slug}/workspaces/${p.provider_slug}`}
              className="block"
            >
              <Card className="hover:border-primary transition-colors">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center overflow-hidden">
                    {p.provider_logo_url ? (
                      <img src={p.provider_logo_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.provider_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.workspace_id ? "Workspace open" : "Tap to open workspace"}
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
