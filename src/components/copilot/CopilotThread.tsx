// CopilotThread: connects useChat to the copilot-chat edge function with the
// user's JWT, renders messages via AI Elements, and exposes tool intents
// to the inline approval renderer.

import { useEffect, useMemo, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCopilot } from "@/contexts/CopilotContext";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { CopilotToolPart } from "./CopilotToolPart";
import { CopilotEmptyState } from "./CopilotEmptyState";

const FUNCTIONS_BASE = "https://tehhrjepyfnhmsgtwzkf.supabase.co/functions/v1/copilot-chat";

interface CopilotThreadProps {
  threadId: string;
  initialMessages?: UIMessage[];
  onFinish?: () => void;
}

export function CopilotThread({ threadId, initialMessages, onFinish }: CopilotThreadProps) {
  const { session, user } = useAuth();
  const { routeContext } = useCopilot();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cancelSavedRef = useRef(false);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: FUNCTIONS_BASE,
        headers: () => ({
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        }),
        body: () => ({ threadId, routeContext }),
      }),
    [session?.access_token, threadId, routeContext],
  );

  const { messages, sendMessage, status, stop, error } = useChat({
    id: threadId,
    transport,
    messages: initialMessages,
    onError: (e) => {
      const parsed = parseCopilotError(e.message);
      if (parsed?.code === "rate_limited") {
        toast.error("Copilot rate limit reached", {
          description: parsed.error,
          duration: 8000,
        });
      } else {
        toast.error(parsed?.error ?? e.message);
      }
    },
    onFinish: async ({ message, isAbort }) => {
      // On abort the edge runtime can be torn down with the connection,
      // so the server's onFinish is unreliable. Persist the partial
      // assistant message from the client instead.
      if (isAbort && user && !cancelSavedRef.current) {
        cancelSavedRef.current = true;
        const parts = ((message?.parts ?? []) as UIMessage["parts"]).map(
          (p) => ({ ...p }),
        ) as UIMessage["parts"];
        let lastTextIdx = -1;
        parts.forEach((p, i) => {
          if (p.type === "text") lastTextIdx = i;
        });
        if (lastTextIdx >= 0) {
          const t = parts[lastTextIdx] as { type: "text"; text: string };
          t.text = `${t.text}\n\n_Stopped._`;
        } else {
          parts.push({ type: "text", text: "_Stopped._" } as never);
        }
        if (parts.length > 0) {
          const { error: insertErr } = await supabase
            .from("copilot_messages")
            .insert({
              thread_id: threadId,
              role: "assistant",
              ai_sdk_id: message?.id ?? null,
              parts: parts as never,
            });
          if (insertErr) {
            console.error("Failed to persist canceled message", insertErr);
          }
        }
      }
      onFinish?.();
    },
  });

  // Reset the cancel-saved guard whenever a new turn starts.
  useEffect(() => {
    if (status === "submitted" || status === "streaming") {
      cancelSavedRef.current = false;
    }
  }, [status]);

  // Focus management
  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId]);

  useEffect(() => {
    if (status === "ready") textareaRef.current?.focus();
  }, [status]);

  // Show shimmer while submitted, or while streaming but the assistant
  // message has not produced any text/tool parts yet.
  const lastMessage = messages[messages.length - 1];
  const lastIsAssistantWithContent =
    lastMessage?.role === "assistant" && (lastMessage.parts?.length ?? 0) > 0;
  const showThinking =
    status === "submitted" ||
    (status === "streaming" && !lastIsAssistantWithContent);
  const showStreamingPill = status === "streaming" && lastIsAssistantWithContent;

  

  return (
    <div className="flex h-full flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              title=""
              description=""
              className="border-none"
            >
              <CopilotEmptyState
                onPick={(text) => sendMessage({ text })}
              />
            </ConversationEmptyState>
          ) : null}

          {messages.map((m) => (
            <Message key={m.id} from={m.role === "user" ? "user" : "assistant"}>
              <MessageContent
                className={
                  m.role === "user"
                    ? "group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground"
                    : "bg-transparent p-0"
                }
              >
                {m.parts.map((part, idx) => {
                  if (part.type === "text") {
                    return (
                      <MessageResponse key={idx}>
                        {(part as { text: string }).text}
                      </MessageResponse>
                    );
                  }
                  if (part.type?.startsWith("tool-") || part.type === "dynamic-tool") {
                    return (
                      <CopilotToolPart
                        key={idx}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        part={part as any}
                      />
                    );
                  }
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}

          {showThinking ? (
            <Message from="assistant">
              <MessageContent className="bg-transparent p-0">
                <Shimmer>Thinking…</Shimmer>
              </MessageContent>
            </Message>
          ) : null}

          {showStreamingPill ? (
            <div
              className="flex items-center gap-2 px-1 text-xs text-muted-foreground"
              aria-live="polite"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              <Shimmer>Streaming…</Shimmer>
            </div>
          ) : null}

          {error ? (() => {
            const parsed = parseCopilotError(error.message);
            const isRateLimited = parsed?.code === "rate_limited";
            return (
              <div
                role="alert"
                className={
                  isRateLimited
                    ? "rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300"
                    : "rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
                }
              >
                <div className="font-medium">
                  {isRateLimited ? "Slow down a moment" : "Something went wrong"}
                </div>
                <div className="mt-1 opacity-90">
                  {parsed?.error ?? error.message}
                </div>
              </div>
            );
          })() : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t bg-background p-3">
        <PromptInput
          onSubmit={(message) => {
            const text = message.text?.trim();
            if (!text) return;
            sendMessage({ text });
          }}
        >
          <PromptInputTextarea
            ref={textareaRef}
            placeholder="Ask the Elsa Copilot…"
            autoFocus
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
