import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TrainingInterestIntent, TrainingLeadStatus } from "@/lib/trainingInterest";

export interface TrainingLeadRow {
  id: string;
  intent: TrainingInterestIntent;
  email: string;
  contact_name: string | null;
  role: string | null;
  company: string | null;
  company_size: string | null;
  interest: string | null;
  preferred_length: string | null;
  start_month: string | null;
  headcount: number | null;
  delivery: string | null;
  timezone_region: string | null;
  notes: string | null;
  organization_name: string | null;
  website: string | null;
  regions: string[] | null;
  languages: string[] | null;
  offerings: string[] | null;
  experience: string | null;
  outline_url: string | null;
  source_page: string | null;
  user_id: string | null;
  status: TrainingLeadStatus;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export const TRAINING_LEADS_KEY = ["training-leads"];

export function useTrainingLeads() {
  const queryClient = useQueryClient();

  const leads = useQuery({
    queryKey: TRAINING_LEADS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TrainingLeadRow[];
    },
  });

  const updateLead = useMutation({
    mutationFn: async (input: {
      id: string;
      status?: TrainingLeadStatus;
      internal_notes?: string | null;
    }) => {
      const { id, ...changes } = input;
      const { error } = await supabase.from("training_leads").update(changes).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_LEADS_KEY });
      toast.success("Lead updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not update the lead");
    },
  });

  return {
    leads: leads.data ?? [],
    isLoading: leads.isLoading,
    updateLead: updateLead.mutate,
    isUpdating: updateLead.isPending,
  };
}
