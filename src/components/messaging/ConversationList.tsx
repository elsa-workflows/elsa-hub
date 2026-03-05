import { formatDistanceToNow } from "date-fns";
import { MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ConversationSummary } from "@/hooks/useConversations";

interface ConversationListProps {
  conversations: ConversationSummary[];
  selectedId: string | undefined;
  onSelect: (conversation: ConversationSummary) => void;
  isLoading: boolean;
  emptyMessage?: string;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isLoading,
  emptyMessage = "No conversations yet",
}: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted/50 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <MessageSquare className="h-10 w-10 mb-3 opacity-50" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 p-2">
      {conversations.map((conv) => (
        <button
          key={conv.id}
          onClick={() => onSelect(conv)}
          className={cn(
            "w-full text-left p-3 rounded-lg transition-colors hover:bg-muted/50",
            selectedId === conv.id && "bg-muted"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">
                  {conv.other_party_name}
                </p>
                {conv.unread_count > 0 && (
                  <Badge variant="default" className="text-xs h-5 px-1.5">
                    {conv.unread_count}
                  </Badge>
                )}
              </div>
              {conv.last_message_body && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  <span className="font-medium">
                    {conv.last_message_sender_name}:
                  </span>{" "}
                  {conv.last_message_body}
                </p>
              )}
            </div>
            {conv.last_message_at && (
              <p className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(conv.last_message_at), {
                  addSuffix: true,
                })}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
