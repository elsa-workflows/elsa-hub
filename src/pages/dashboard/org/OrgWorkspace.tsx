import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizations } from "@/hooks/useOrganizations";
import { EngagementWorkspace, type SummaryPayload } from "@/components/workspace";
import { CustomerHoursCard } from "../provider/ProviderWorkspace";

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

  const { data: workLogs = [] } = useQuery({
    queryKey: ["org-provider-work-logs", organization?.id, provider?.id],
    queryFn: async () => {
      if (!organization?.id || !provider?.id) return [];
      const { data: logs } = await supabase
        .from("work_logs")
        .select("id, performed_at, category, description, minutes_spent, performed_by")
        .eq("organization_id", organization.id)
        .eq("service_provider_id", provider.id)
        .order("performed_at", { ascending: false })
        .limit(50);
      if (!logs || logs.length === 0) return [];

      const performerIds = [...new Set(logs.map((l) => l.performed_by))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", performerIds);
      const nameMap = new Map(profiles?.map((p) => [p.user_id, p.display_name || p.email]) || []);

      return logs.map((l) => ({
        id: l.id,
        performed_at: l.performed_at,
        category: l.category,
        description: l.description,
        minutes_spent: l.minutes_spent,
        performer_name: nameMap.get(l.performed_by) || null,
      }));
    },
    enabled: !!organization?.id && !!provider?.id,
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

      <CustomerHoursCard
        logs={workLogs}
        providerSlug={provider.slug}
        organizationId={organization.id}
        readOnly
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
