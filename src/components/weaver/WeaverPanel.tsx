// Sliding side panel that hosts the weaver chat + a thread switcher.
// Threaded history is loaded on demand from weaver_threads.

import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, MessagesSquare } from "lucide-react";
import type { UIMessage } from "ai";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWeaver } from "@/contexts/WeaverContext";
import { WeaverThread } from "./WeaverThread";

export function WeaverPanel() {
  const { open, closePanel, threadId, newThread, setThreadId } = useWeaver();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showList, setShowList] = useState(false);

  const { data: threads, isLoading } = useQuery({
    queryKey: ["weaver-threads", user?.id],
    enabled: open && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weaver_threads")
        .select("id, title, last_message_at")
        .order("last_message_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: initialMessages, isLoading: loadingMessages } = useQuery({
    queryKey: ["weaver-messages", threadId],
    enabled: open && !!threadId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weaver_messages")
        .select("ai_sdk_id, role, parts, created_at")
        .eq("thread_id", threadId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(
        (row) =>
          ({
            id: row.ai_sdk_id ?? `${row.role}-${row.created_at}`,
            role: row.role as "user" | "assistant",
            parts: (row.parts as UIMessage["parts"]) ?? [],
          }) satisfies UIMessage,
      );
    },
  });

  useEffect(() => {
    if (open && !threadId) newThread();
  }, [open, threadId, newThread]);

  const handleFinish = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["weaver-threads", user?.id] });
    if (threadId) {
      queryClient.invalidateQueries({ queryKey: ["weaver-messages", threadId] });
    }
  }, [queryClient, user?.id, threadId]);

  return (
    <Sheet open={open} onOpenChange={(o) => (!o ? closePanel() : null)}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px] lg:max-w-[560px]"
      >
        <SheetHeader className="flex flex-row items-center justify-between space-y-0 border-b p-3">
          <SheetTitle className="text-base">Elsa Weaver</SheetTitle>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowList((s) => !s)}
              aria-label="Conversation history"
              title="Conversation history"
            >
              <MessagesSquare className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                newThread();
                setShowList(false);
              }}
              aria-label="Start a new chat"
              title="Start a new chat"
              className="h-8 gap-1.5 px-2.5 text-xs"
            >
              <Plus className="size-3.5" />
              New chat
            </Button>
          </div>
        </SheetHeader>

        {showList ? (
          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-1 p-2">
              {isLoading ? (
                <>
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </>
              ) : !user ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Sign in to keep chat history.
                </div>
              ) : threads && threads.length > 0 ? (
                threads.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setThreadId(t.id);
                      setShowList(false);
                    }}
                    className={`flex flex-col items-start rounded-md px-3 py-2 text-left text-sm hover:bg-muted ${
                      t.id === threadId ? "bg-muted" : ""
                    }`}
                  >
                    <span className="truncate font-medium">{t.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(t.last_message_at).toLocaleString()}
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No conversations yet.
                </div>
              )}
            </div>
          </ScrollArea>
        ) : threadId ? (
          loadingMessages ? (
            <div className="flex-1 space-y-3 p-4">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-12 w-2/3" />
            </div>
          ) : (
            <WeaverThread
              key={threadId}
              threadId={threadId}
              initialMessages={initialMessages ?? []}
              onFinish={handleFinish}
            />
          )
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
