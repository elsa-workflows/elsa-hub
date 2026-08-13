import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type EnquiryStatus = "new" | "contacted" | "closed";

export interface RuntimeEnquiryRow {
  id: string;
  service_provider_id: string;
  organization_name: string;
  contact_name: string;
  contact_email: string;
  tier: string;
  message: string;
  source_page: string | null;
  user_id: string | null;
  status: EnquiryStatus;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useRuntimeEnquiries(providerId: string | undefined) {
  const queryClient = useQueryClient();

  const enquiries = useQuery({
    queryKey: ["runtime-enquiries", providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("runtime_enquiries")
        .select("*")
        .eq("service_provider_id", providerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RuntimeEnquiryRow[];
    },
    enabled: !!providerId,
  });

  const updateEnquiry = useMutation({
    mutationFn: async (input: {
      id: string;
      status?: EnquiryStatus;
      internal_notes?: string | null;
    }) => {
      const { id, ...changes } = input;
      const { error } = await supabase.from("runtime_enquiries").update(changes).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["runtime-enquiries", providerId] });
      toast.success("Enquiry updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not update the enquiry");
    },
  });

  return {
    enquiries: enquiries.data ?? [],
    isLoading: enquiries.isLoading,
    updateEnquiry: updateEnquiry.mutate,
    isUpdating: updateEnquiry.isPending,
  };
}
