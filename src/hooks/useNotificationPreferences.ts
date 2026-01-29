import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_enabled: boolean;
  notify_purchase: boolean;
  notify_work_logged: boolean;
  notify_subscription: boolean;
  created_at: string;
  updated_at: string;
}

export function useNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      // If no preferences exist, return defaults
      if (!data) {
        return {
          id: "",
          user_id: user.id,
          email_enabled: true,
          notify_purchase: true,
          notify_work_logged: true,
          notify_subscription: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as NotificationPreferences;
      }

      return data as NotificationPreferences;
    },
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      if (!user) throw new Error("Not authenticated");

      // Check if preferences exist
      const { data: existing } = await supabase
        .from("notification_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("notification_preferences")
          .update(updates)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("notification_preferences")
          .insert({ user_id: user.id, ...updates });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated.",
      });
    },
    onError: (error) => {
      console.error("Failed to update preferences:", error);
      toast({
        title: "Error",
        description: "Failed to save notification preferences.",
        variant: "destructive",
      });
    },
  });

  return {
    preferences: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updatePreferences: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
