import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface IntroCallRequest {
  id: string;
  full_name: string;
  company_name: string;
  email: string;
  project_stage: string;
  current_usage: string;
  discussion_topics: string;
  interests: string[] | null;
  status: string;
  internal_notes: string | null;
  scheduled_at: string | null;
  created_at: string;
  user_id: string | null;
  organization_id: string | null;
}

const PROJECT_STAGE_LABELS: Record<string, string> = {
  exploring: "Exploring / Evaluating",
  poc: "Proof of Concept",
  pre_production: "Pre-Production",
  production: "Production",
};

export function getProjectStageLabel(stage: string): string {
  return PROJECT_STAGE_LABELS[stage] || stage;
}

const STATUS_OPTIONS = ["pending", "scheduled", "completed", "declined", "archived"] as const;
export type IntroCallStatus = (typeof STATUS_OPTIONS)[number];

export function useIntroCallRequests(includeArchived = false) {
  const queryClient = useQueryClient();

  const requestsQuery = useQuery({
    queryKey: ["intro-call-requests", { includeArchived }],
    queryFn: async () => {
      let query = supabase
        .from("intro_call_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (!includeArchived) {
        query = query.neq("status", "archived");
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as IntroCallRequest[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      requestId,
      status,
      internalNotes,
      scheduledAt,
    }: {
      requestId: string;
      status: IntroCallStatus;
      internalNotes?: string;
      scheduledAt?: string | null;
    }) => {
      const updates: Record<string, unknown> = { status };
      if (internalNotes !== undefined) updates.internal_notes = internalNotes;
      if (scheduledAt !== undefined) updates.scheduled_at = scheduledAt;

      const { error } = await supabase
        .from("intro_call_requests")
        .update(updates)
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intro-call-requests"] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("intro_call_requests")
        .update({ status: "archived" })
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intro-call-requests"] });
    },
  });

  return {
    requests: requestsQuery.data || [],
    isLoading: requestsQuery.isLoading,
    error: requestsQuery.error,
    updateStatus: updateStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending,
    archiveRequest: archiveMutation.mutate,
    isArchiving: archiveMutation.isPending,
    refetch: requestsQuery.refetch,
  };
}
