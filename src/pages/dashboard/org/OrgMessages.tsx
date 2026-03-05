import { useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useOrganizationDashboard } from "@/hooks/useOrganizationDashboard";
import { useConversations, type ConversationSummary } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import {
  ConversationList,
  ConversationThread,
  MessageInput,
  NewConversationDialog,
} from "@/components/messaging";

export default function OrgMessages() {
  const { slug } = useParams<{ slug: string }>();
  const { organization, isLoading: orgLoading } = useOrganizationDashboard(slug);
  const [selectedConv, setSelectedConv] = useState<ConversationSummary | null>(null);

  const {
    data: conversations,
    isLoading: convsLoading,
  } = useConversations("org", organization?.id);

  const {
    messages,
    isLoading: msgsLoading,
    sendMessageWithNotification,
    isSending,
    markAsRead,
  } = useMessages(selectedConv?.id);

  const handleSend = useCallback(
    async (body: string) => {
      if (!selectedConv) return;
      await sendMessageWithNotification({
        conversationId: selectedConv.id,
        body,
        conversationOrgId: selectedConv.organization_id,
        conversationProviderId: selectedConv.service_provider_id,
        senderContextType: "org",
      });
    },
    [selectedConv, sendMessageWithNotification]
  );

  const handleMarkAsRead = useCallback(
    (ids: string[]) => markAsRead(ids),
    [markAsRead]
  );

  if (orgLoading) {
    return (
      <div className="p-6">
        <div className="h-8 bg-muted/50 animate-pulse rounded w-48 mb-4" />
        <div className="h-96 bg-muted/50 animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-muted-foreground mt-1">
          Communicate with your service providers
        </p>
      </div>

      <Card className="flex h-[calc(100vh-220px)] min-h-[400px] overflow-hidden">
        {/* Conversation list */}
        <div className="w-80 border-r flex flex-col shrink-0">
          <div className="p-3 border-b">
            <h3 className="font-medium text-sm text-muted-foreground">
              Conversations
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ConversationList
              conversations={conversations || []}
              selectedId={selectedConv?.id}
              onSelect={setSelectedConv}
              isLoading={convsLoading}
              emptyMessage="No conversations with providers yet"
            />
          </div>
        </div>

        {/* Thread */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedConv ? (
            <>
              <div className="p-3 border-b">
                <h3 className="font-medium">{selectedConv.other_party_name}</h3>
              </div>
              <ConversationThread
                messages={messages}
                isLoading={msgsLoading}
                onMarkAsRead={handleMarkAsRead}
              />
              <MessageInput onSend={handleSend} isSending={isSending} />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Select a conversation to view messages</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
