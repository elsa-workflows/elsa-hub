// Sliding side panel that hosts the weaver chat + a thread switcher.
// Signed-in users: threads/messages persist in weaver_threads/weaver_messages.
// Anonymous users: threads/messages persist in localStorage.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, MessagesSquare, Trash2, Maximize2, Minimize2 } from "lucide-react";
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
import {
  deleteLocalThread,
  getLocalMessages,
  listLocalThreads,
  saveLocalThread,
  type LocalThreadMeta,
} from "@/lib/weaverLocalThreads";

export function WeaverPanel() {
  const { open, closePanel, threadId, newThread, setThreadId } = useWeaver();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showList, setShowList] = useState(false);

  // ---- Signed-in: DB-backed threads ----
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

  // ---- Anonymous: localStorage threads ----
  const [localThreads, setLocalThreads] = useState<LocalThreadMeta[]>([]);
  const refreshLocalThreads = useCallback(() => {
    setLocalThreads(listLocalThreads());
  }, []);

  useEffect(() => {
    if (user || !open) return;
    refreshLocalThreads();
    const onChange = () => refreshLocalThreads();
    window.addEventListener("weaver:anon:threads-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("weaver:anon:threads-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [user, open, refreshLocalThreads]);

  const localInitialMessages = useMemo<UIMessage[]>(() => {
    if (user || !threadId) return [];
    return getLocalMessages(threadId);
  }, [user, threadId]);

  useEffect(() => {
    if (open && !threadId) newThread();
  }, [open, threadId, newThread]);

  const handleFinish = useCallback(() => {
    if (!user) return;
    queryClient.invalidateQueries({ queryKey: ["weaver-threads", user.id] });
    if (threadId) {
      queryClient.invalidateQueries({ queryKey: ["weaver-messages", threadId] });
    }
  }, [queryClient, user, threadId]);

  const handleLocalMessagesChange = useCallback(
    (msgs: UIMessage[]) => {
      if (user || !threadId) return;
      saveLocalThread(threadId, msgs);
    },
    [user, threadId],
  );

  const handleDeleteLocal = useCallback(
    (id: string) => {
      deleteLocalThread(id);
      if (id === threadId) newThread();
    },
    [threadId, newThread],
  );

  const isAnon = !user;
  const visibleThreads = isAnon ? localThreads : threads ?? [];

  // Keyboard shortcuts:
  //   Cmd/Ctrl+Shift+O          → start a new chat
  //   Cmd/Ctrl+Shift+L          → toggle the conversation list
  //   Alt+ArrowUp / Alt+ArrowDown → switch to the prev/next thread
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.shiftKey && (e.key === "o" || e.key === "O")) {
        e.preventDefault();
        newThread();
        setShowList(false);
        return;
      }

      if (mod && e.shiftKey && (e.key === "l" || e.key === "L")) {
        e.preventDefault();
        setShowList((s) => !s);
        return;
      }

      if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        if (visibleThreads.length === 0) return;
        e.preventDefault();
        const idx = visibleThreads.findIndex((t) => t.id === threadId);
        const delta = e.key === "ArrowUp" ? -1 : 1;
        const next = visibleThreads[(idx + delta + visibleThreads.length) % visibleThreads.length];
        if (next?.id) setThreadId(next.id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, visibleThreads, threadId, newThread, setThreadId]);

  return (
    <Sheet open={open} onOpenChange={(o) => (!o ? closePanel() : null)}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px] lg:max-w-[560px]"
      >
        <SheetHeader className="flex flex-row items-center justify-between space-y-0 border-b p-3 pr-12">
          <SheetTitle className="text-base">Elsa Weaver</SheetTitle>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowList((s) => !s)}
              aria-label="Conversation history (⌘/Ctrl+Shift+L)"
              title="Conversation history — ⌘/Ctrl+Shift+L · Alt+↑/↓ to switch"
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
              aria-label="Start a new chat (⌘/Ctrl+Shift+O)"
              title="Start a new chat — ⌘/Ctrl+Shift+O"
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
              {!isAnon && isLoading ? (
                <>
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </>
              ) : visibleThreads.length > 0 ? (
                <>
                  {isAnon ? (
                    <div className="px-2 pb-1 pt-1 text-[11px] text-muted-foreground">
                      Saved in this browser. Sign in to keep history across devices.
                    </div>
                  ) : null}
                  {visibleThreads.map((t) => (
                    <div
                      key={t.id}
                      className={`group flex items-center gap-1 rounded-md pr-1 hover:bg-muted ${
                        t.id === threadId ? "bg-muted" : ""
                      }`}
                    >
                      <button
                        onClick={() => {
                          setThreadId(t.id);
                          setShowList(false);
                        }}
                        className="flex flex-1 flex-col items-start px-3 py-2 text-left text-sm"
                      >
                        <span className="line-clamp-1 font-medium">{t.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(t.last_message_at).toLocaleString()}
                        </span>
                      </button>
                      {isAnon ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Delete conversation"
                          title="Delete conversation"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLocal(t.id);
                          }}
                          className="opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No conversations yet.
                </div>
              )}
            </div>
          </ScrollArea>
        ) : threadId ? (
          !isAnon && loadingMessages ? (
            <div className="flex-1 space-y-3 p-4">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-12 w-2/3" />
            </div>
          ) : (
            <WeaverThread
              key={threadId}
              threadId={threadId}
              initialMessages={isAnon ? localInitialMessages : initialMessages ?? []}
              onFinish={handleFinish}
              onMessagesChange={isAnon ? handleLocalMessagesChange : undefined}
            />
          )
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
