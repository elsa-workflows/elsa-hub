import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Message {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  sender_name: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export function useMessages(conversationId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const messagesQuery = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async (): Promise<Message[]> => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_user_id, body, created_at, read_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Fetch sender profiles
      const senderIds = [...new Set(data.map((m) => m.sender_user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", senderIds);

      const profileMap = new Map(
        profiles?.map((p) => [
          p.user_id,
          p.display_name || p.email || "Unknown",
        ]) || []
      );

      return data.map((m) => ({
        ...m,
        sender_name: profileMap.get(m.sender_user_id) || "Unknown",
      }));
    },
    enabled: !!conversationId,
    refetchInterval: 10000, // Poll every 10s
  });

  // Send message
  const sendMessage = useMutation({
    mutationFn: async ({
      conversationId: convId,
      body,
    }: {
      conversationId: string;
      body: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: convId,
          sender_user_id: user.id,
          body,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", variables.conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  // Send notification after message
  const sendMessageWithNotification = async ({
    conversationId: convId,
    body,
    conversationOrgId,
    conversationProviderId,
    senderContextType,
  }: {
    conversationId: string;
    body: string;
    conversationOrgId: string;
    conversationProviderId: string;
    senderContextType: "org" | "provider";
  }) => {
    const result = await sendMessage.mutateAsync({ conversationId: convId, body });

    // Fire-and-forget notification
    try {
      await supabase.functions.invoke("send-message-notification", {
        body: {
          conversationId: convId,
          messageBody: body,
          senderContextType,
          organizationId: conversationOrgId,
          serviceProviderId: conversationProviderId,
        },
      });
    } catch (err) {
      console.error("Failed to send message notification:", err);
    }

    return result;
  };

  // Mark messages as read
  const markAsRead = useMutation({
    mutationFn: async (messageIds: string[]) => {
      if (!user || messageIds.length === 0) return;

      const { error } = await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .in("id", messageIds)
        .neq("sender_user_id", user.id)
        .is("read_at", null);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  return {
    messages: messagesQuery.data || [],
    isLoading: messagesQuery.isLoading,
    sendMessage: sendMessage.mutate,
    sendMessageWithNotification,
    isSending: sendMessage.isPending,
    markAsRead: markAsRead.mutate,
  };
}
