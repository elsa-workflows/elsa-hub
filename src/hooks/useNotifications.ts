import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { Notification, NotificationType } from "@/types/notifications";

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch unread notifications
  const query = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .is("dismissed_at", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []) as Notification[];
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Dismiss mutation (for ignore/close actions)
  const dismissMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ dismissed_at: new Date().toISOString() })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Accept invitation (special case - uses existing RPC)
  const acceptInvitationMutation = useMutation({
    mutationFn: async ({
      notificationId,
      token,
    }: {
      notificationId: string;
      token: string;
    }) => {
      const { data, error } = await supabase.rpc("accept_invitation", {
        p_token: token,
      });

      if (error) throw error;

      // Also dismiss the notification
      await supabase
        .from("notifications")
        .update({ dismissed_at: new Date().toISOString() })
        .eq("id", notificationId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast({
        title: "Invitation accepted",
        description: "You have joined the organization.",
      });
    },
    onError: (error: Error) => {
      console.error("Failed to accept invitation:", error);
      toast({
        title: "Failed to accept invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Ignore invitation (special case - uses existing RPC via notification)
  const ignoreInvitationMutation = useMutation({
    mutationFn: async ({
      notificationId,
      invitationId,
    }: {
      notificationId: string;
      invitationId: string;
    }) => {
      // Mark invitation as ignored
      await supabase.rpc("ignore_invitation", {
        p_invitation_id: invitationId,
      });

      // Dismiss the notification
      await supabase
        .from("notifications")
        .update({ dismissed_at: new Date().toISOString() })
        .eq("id", notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast({
        title: "Invitation ignored",
        description: "The invitation has been dismissed.",
      });
    },
    onError: (error: Error) => {
      console.error("Failed to ignore invitation:", error);
      toast({
        title: "Error",
        description: "Failed to ignore invitation.",
        variant: "destructive",
      });
    },
  });

  const notifications = query.data || [];
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return {
    notifications,
    unreadCount,
    isLoading: query.isLoading,
    error: query.error,
    markAsRead: markAsReadMutation.mutate,
    dismiss: dismissMutation.mutate,
    acceptInvitation: acceptInvitationMutation.mutate,
    ignoreInvitation: ignoreInvitationMutation.mutate,
    isAccepting: acceptInvitationMutation.isPending,
    isIgnoring: ignoreInvitationMutation.isPending,
  };
}
