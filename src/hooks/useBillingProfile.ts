import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BillingProfile {
  id: string;
  organization_id: string;
  company_legal_name: string | null;
  registration_number: string | null;
  vat_number: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingProfileFormData {
  company_legal_name?: string;
  registration_number?: string;
  vat_number?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
}

export function useBillingProfile(organizationId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ["billing-profile", organizationId];

  const { data: billingProfile, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!organizationId) return null;

      const { data, error } = await supabase
        .from("org_billing_profiles")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (error) throw error;
      return data as BillingProfile | null;
    },
    enabled: !!organizationId,
  });

  const { mutate: updateBillingProfile, isPending: isUpdating } = useMutation({
    mutationFn: async (formData: BillingProfileFormData) => {
      if (!organizationId) throw new Error("Organization ID required");

      // Clean up empty strings to null
      const cleanData = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => [
          key,
          value?.trim() || null,
        ])
      );

      if (billingProfile) {
        // Update existing
        const { data, error } = await supabase
          .from("org_billing_profiles")
          .update(cleanData)
          .eq("id", billingProfile.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("org_billing_profiles")
          .insert({ organization_id: organizationId, ...cleanData })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Billing information saved");
    },
    onError: (error) => {
      console.error("Failed to save billing profile:", error);
      toast.error("Failed to save billing information");
    },
  });

  return {
    billingProfile,
    isLoading,
    updateBillingProfile,
    isUpdating,
  };
}
