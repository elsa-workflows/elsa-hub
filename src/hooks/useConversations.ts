import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ConversationSummary {
  id: string;
  organization_id: string;
  service_provider_id: string;
  other_party_name: string;
  other_party_slug: string;
  created_at: string;
  last_message_body: string | null;
  last_message_at: string | null;
  last_message_sender_name: string | null;
  unread_count: number;
}

export function useConversations(
  contextType: "org" | "provider",
  entityId: string | undefined
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["conversations", contextType, entityId],
    queryFn: async (): Promise<ConversationSummary[]> => {
      if (!entityId || !user) return [];

      const filterColumn =
        contextType === "org" ? "organization_id" : "service_provider_id";
      const otherColumn =
        contextType === "org" ? "service_provider_id" : "organization_id";

      const { data: conversations, error } = await supabase
        .from("conversations")
        .select("id, organization_id, service_provider_id, created_at")
        .eq(filterColumn, entityId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!conversations || conversations.length === 0) return [];

      // Fetch other party names
      const otherIds = conversations.map(
        (c) => c[otherColumn as keyof typeof c] as string
      );
      const otherTable =
        contextType === "org" ? "service_providers" : "organizations";
      const { data: otherParties } = await supabase
        .from(otherTable)
        .select("id, name, slug")
        .in("id", otherIds);

      const otherMap = new Map(
        otherParties?.map((p) => [p.id, p]) || []
      );

      // Fetch last message + unread count for each conversation
      const conversationIds = conversations.map((c) => c.id);
      const { data: allMessages } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_user_id, body, created_at, read_at")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false });

      // Get sender profiles
      const senderIds = [
        ...new Set(allMessages?.map((m) => m.sender_user_id) || []),
      ];
      const { data: senderProfiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", senderIds);

      const senderMap = new Map(
        senderProfiles?.map((p) => [
          p.user_id,
          p.display_name || p.email || "Unknown",
        ]) || []
      );

      // Group messages by conversation
      const messagesByConversation = new Map<string, typeof allMessages>();
      for (const msg of allMessages || []) {
        if (!messagesByConversation.has(msg.conversation_id)) {
          messagesByConversation.set(msg.conversation_id, []);
        }
        messagesByConversation.get(msg.conversation_id)!.push(msg);
      }

      return conversations.map((conv) => {
        const otherId = conv[otherColumn as keyof typeof conv] as string;
        const other = otherMap.get(otherId);
        const msgs = messagesByConversation.get(conv.id) || [];
        const lastMsg = msgs[0] || null;
        const unreadCount = msgs.filter(
          (m) => m.sender_user_id !== user.id && !m.read_at
        ).length;

        return {
          id: conv.id,
          organization_id: conv.organization_id,
          service_provider_id: conv.service_provider_id,
          other_party_name: other?.name || "Unknown",
          other_party_slug: other?.slug || "",
          created_at: conv.created_at,
          last_message_body: lastMsg?.body || null,
          last_message_at: lastMsg?.created_at || null,
          last_message_sender_name: lastMsg
            ? senderMap.get(lastMsg.sender_user_id) || "Unknown"
            : null,
          unread_count: unreadCount,
        };
      }).sort((a, b) => {
        const aTime = a.last_message_at || a.created_at;
        const bTime = b.last_message_at || b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
    },
    enabled: !!entityId && !!user,
    refetchInterval: 30000, // Poll every 30s
  });
}
