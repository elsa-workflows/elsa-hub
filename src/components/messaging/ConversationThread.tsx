import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import type { Message } from "@/hooks/useMessages";

interface ConversationThreadProps {
  messages: Message[];
  isLoading: boolean;
  onMarkAsRead: (ids: string[]) => void;
}

export function ConversationThread({
  messages,
  isLoading,
  onMarkAsRead,
}: ConversationThreadProps) {
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Mark unread messages as read when viewing
  useEffect(() => {
    if (!user) return;
    const unreadIds = messages
      .filter((m) => m.sender_user_id !== user.id && !m.read_at)
      .map((m) => m.id);
    if (unreadIds.length > 0) {
      onMarkAsRead(unreadIds);
    }
  }, [messages, user, onMarkAsRead]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p className="text-sm">No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((msg) => {
        const isMe = msg.sender_user_id === user?.id;
        return (
          <div
            key={msg.id}
            className={cn("flex", isMe ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[75%] rounded-lg px-4 py-2",
                isMe
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              {!isMe && (
                <p className="text-xs font-medium mb-1 opacity-70">
                  {msg.sender_name}
                </p>
              )}
              <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
              <p
                className={cn(
                  "text-xs mt-1",
                  isMe ? "text-primary-foreground/60" : "text-muted-foreground"
                )}
              >
                {format(new Date(msg.created_at), "MMM d, h:mm a")}
              </p>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
