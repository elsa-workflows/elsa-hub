import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useProviderDashboard } from "@/hooks/useProviderDashboard";
import { EngagementWorkspace, type SummaryPayload } from "@/components/workspace";
import { LogWorkDialog } from "@/components/provider/LogWorkDialog";
import type { WorkspaceSession } from "@/hooks/useWorkspaceSessions";

const categoryColors: Record<string, "default" | "secondary" | "outline"> = {
  development: "default",
  consulting: "secondary",
  training: "outline",
  support: "secondary",
  other: "outline",
};

function minutesToHours(minutes: number): string {
  return (minutes / 60).toFixed(1);
}

export default function ProviderWorkspace() {
  const { slug, orgSlug } = useParams<{ slug: string; orgSlug: string }>();
  const { provider, customers, workLogs, refetchWorkLogs, refetchCustomers } = useProviderDashboard(slug);
  const [summary, setSummary] = useState<SummaryPayload | null>(null);
  const [sessionToLog, setSessionToLog] = useState<WorkspaceSession | null>(null);

  const { data: organization } = useQuery({
    queryKey: ["org-by-slug", orgSlug],
    queryFn: async () => {
      if (!orgSlug) return null;
      const { data } = await supabase
        .from("organizations")
        .select("id, name, slug")
        .eq("slug", orgSlug)
        .maybeSingle();
      return data;
    },
    enabled: !!orgSlug,
  });

  if (!provider || !organization) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center text-muted-foreground">Loading workspace…</Card>
      </div>
    );
  }

  const customerForDialog = customers.find((c) => c.organization_id === organization.id);
  const customerList = customerForDialog
    ? [{ organization_id: customerForDialog.organization_id, organization_name: customerForDialog.organization_name }]
    : [];

  const handleSuccess = () => {
    refetchWorkLogs();
    refetchCustomers();
    setSummary(null);
  };

  return (
    <div className="p-6 space-y-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to={`/dashboard/provider/${slug}/workspaces`}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          All workspaces
        </Link>
      </Button>

      <EngagementWorkspace
        organizationId={organization.id}
        serviceProviderId={provider.id}
        title={`${provider.name} ↔ ${organization.name}`}
        subtitle="Shared with the customer's team."
        onSummaryReady={setSummary}
        onLogWorkFromSession={setSessionToLog}
      />

      {sessionToLog && (
        <LogWorkDialog
          providerId={provider.id}
          providerName={provider.name}
          customers={customerList}
          open={!!sessionToLog}
          onOpenChange={(o) => !o && setSessionToLog(null)}
          onSuccess={() => { handleSuccess(); setSessionToLog(null); }}
          prefill={{
            organizationId: organization.id,
            description: sessionToLog.ai_summary || sessionToLog.notes_markdown || sessionToLog.title,
            minutes: sessionToLog.duration_minutes ?? undefined,
            category: "consulting",
          }}
        />
      )}

      {summary && (
        <Card className="p-4 border-primary/40 space-y-3">
          <div>
            <p className="text-sm font-medium mb-1">AI summary of {summary.fileName}</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{summary.summary}</p>
          </div>

          {summary.keyPoints.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1">Key points</p>
              <ul className="text-sm list-disc pl-5 space-y-1">
                {summary.keyPoints.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {summary.actionItems.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1">Action items</p>
              <ul className="text-sm list-disc pl-5 space-y-1">
                {summary.actionItems.map((a, i) => (
                  <li key={i}>
                    {a.title}
                    {a.owner_hint && <span className="text-muted-foreground"> — {a.owner_hint}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <LogWorkDialog
              providerId={provider.id}
              providerName={provider.name}
              customers={customerList}
              onSuccess={handleSuccess}
              prefill={{
                organizationId: organization.id,
                description: summary.summary,
                minutes: summary.suggestedMinutes,
                category: (summary.suggestedCategory as any) || undefined,
              }}
              trigger={
                <Button size="sm">
                  <Clock className="h-4 w-4 mr-2" />
                  Log work from this summary
                </Button>
              }
            />
            <Button variant="outline" size="sm" onClick={() => setSummary(null)}>
              Dismiss
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
