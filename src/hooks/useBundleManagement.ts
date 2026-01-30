import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type BillingType = Database["public"]["Enums"]["billing_type"];

export interface BundleFormData {
  name: string;
  description?: string | null;
  hours: number;
  monthly_hours?: number | null;
  price_cents: number;
  currency: string;
  billing_type: BillingType;
  recurring_interval?: string | null;
  stripe_price_id?: string | null;
  is_active: boolean;
}

export interface CreateBundleInput extends BundleFormData {
  service_provider_id: string;
}

export interface UpdateBundleInput extends Partial<BundleFormData> {
  id: string;
}

export function useBundleManagement(providerId?: string) {
  const queryClient = useQueryClient();

  const invalidateBundles = () => {
    queryClient.invalidateQueries({ queryKey: ["provider-dashboard", providerId] });
    queryClient.invalidateQueries({ queryKey: ["credit-bundles"] });
  };

  const createBundle = useMutation({
    mutationFn: async (input: CreateBundleInput) => {
      const { data, error } = await supabase
        .from("credit_bundles")
        .insert({
          name: input.name,
          description: input.description,
          hours: input.hours,
          monthly_hours: input.monthly_hours,
          price_cents: input.price_cents,
          currency: input.currency,
          billing_type: input.billing_type,
          recurring_interval: input.recurring_interval,
          stripe_price_id: input.stripe_price_id,
          is_active: input.is_active,
          service_provider_id: input.service_provider_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Bundle created successfully");
      invalidateBundles();
    },
    onError: (error) => {
      toast.error("Failed to create bundle", {
        description: error.message,
      });
    },
  });

  const updateBundle = useMutation({
    mutationFn: async (input: UpdateBundleInput) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from("credit_bundles")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Bundle updated successfully");
      invalidateBundles();
    },
    onError: (error) => {
      toast.error("Failed to update bundle", {
        description: error.message,
      });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("credit_bundles")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(variables.is_active ? "Bundle enabled" : "Bundle disabled");
      invalidateBundles();
    },
    onError: (error) => {
      toast.error("Failed to toggle bundle status", {
        description: error.message,
      });
    },
  });

  return {
    createBundle,
    updateBundle,
    toggleActive,
    isCreating: createBundle.isPending,
    isUpdating: updateBundle.isPending,
    isToggling: toggleActive.isPending,
  };
}
