import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizations } from "@/hooks/useOrganizations";
import { EngagementWorkspace, type SummaryPayload } from "@/components/workspace";

export default function OrgWorkspace() {
  const { slug, providerSlug } = useParams<{ slug: string; providerSlug: string }>();
  const { organizations } = useOrganizations();
  const organization = organizations?.find((o) => o.slug === slug);
  const [summary, setSummary] = useState<SummaryPayload | null>(null);

  const { data: provider } = useQuery({
    queryKey: ["provider-by-slug", providerSlug],
    queryFn: async () => {
      if (!providerSlug) return null;
      const { data } = await supabase
        .from("service_providers")
        .select("id, name, slug")
        .eq("slug", providerSlug)
        .maybeSingle();
      return data;
    },
    enabled: !!providerSlug,
  });

  if (!organization || !provider) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center text-muted-foreground">Loading workspace…</Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to={`/dashboard/org/${slug}/workspaces`}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          All workspaces
        </Link>
      </Button>

      <EngagementWorkspace
        organizationId={organization.id}
        serviceProviderId={provider.id}
        title={`${organization.name} ↔ ${provider.name}`}
        subtitle="Shared with your service provider's team."
        onSummaryReady={setSummary}
      />

      {summary && (
        <Card className="p-4 border-primary/40">
          <p className="text-sm font-medium mb-2">AI summary of {summary.fileName}</p>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{summary.summary}</p>
          {summary.actionItems.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium mb-1">Extracted action items</p>
              <ul className="text-sm list-disc pl-5 space-y-1">
                {summary.actionItems.map((a, i) => (
                  <li key={i}>{a.title}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Only the provider can log work against this engagement.
          </p>
        </Card>
      )}
    </div>
  );
}
