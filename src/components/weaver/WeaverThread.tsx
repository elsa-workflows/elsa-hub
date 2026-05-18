// WeaverThread: connects useChat to the weaver-chat edge function with the
// user's JWT, renders messages via AI Elements, and exposes tool intents
// to the inline approval renderer.

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWeaver } from "@/contexts/WeaverContext";
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
import { WeaverThinking, estimateWeaverProgress } from "./WeaverThinking";
import { TypingDots } from "./TypingDots";
import { CopyResponseButton } from "./CopyResponseButton";
import { WeaverToolPart } from "./WeaverToolPart";
import { WeaverEmptyState } from "./WeaverEmptyState";

const FUNCTIONS_BASE = "https://tehhrjepyfnhmsgtwzkf.supabase.co/functions/v1/weaver-chat";

type WeaverServerError = {
  error: string;
  code?: string;
  retryAfterSeconds?: number;
};

// The AI SDK's `Error.message` for a non-OK response is the raw response body.
// Our edge function returns JSON for known failures; fall back to plain text.
function parseWeaverError(message: string): WeaverServerError | null {
  if (!message) return null;
  try {
    const parsed = JSON.parse(message);
    if (parsed && typeof parsed === "object" && typeof parsed.error === "string") {
      return parsed as WeaverServerError;
    }
  } catch {
    // not JSON
  }
  return null;
}

interface WeaverThreadProps {
  threadId: string;
  initialMessages?: UIMessage[];
  onFinish?: () => void;
  onMessagesChange?: (messages: UIMessage[]) => void;
}

export function WeaverThread({ threadId, initialMessages, onFinish, onMessagesChange }: WeaverThreadProps) {
  const { session, user } = useAuth();
  const { routeContext } = useWeaver();
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
      const parsed = parseWeaverError(e.message);
      if (parsed?.code === "rate_limited") {
        toast.error("Weaver rate limit reached", {
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
            .from("weaver_messages")
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

  // Persist messages externally on every change (used for anon localStorage).
  useEffect(() => {
    onMessagesChange?.(messages);
  }, [messages, onMessagesChange]);

  // Per-thread unsent draft persistence (local-only, both anon and signed-in).
  const draftKey = threadId ? `weaver:draft:${threadId}` : null;

  // Focus management — defer past Radix Sheet's focus trap and re-try a few
  // frames in case the textarea is mounted late after a thread switch.
  useEffect(() => {
    let cancelled = false;
    const tries = [0, 60, 180, 360];
    const timers = tries.map((delay) =>
      window.setTimeout(() => {
        if (cancelled) return;
        const el = textareaRef.current;
        if (!el) return;
        // Place caret at end so the draft stays put.
        const len = el.value.length;
        el.focus({ preventScroll: true });
        try {
          el.setSelectionRange(len, len);
        } catch {
          /* ignore non-text inputs */
        }
      }, delay),
    );
    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [threadId]);

  // Restore the saved draft (if any) when the active thread changes.
  useEffect(() => {
    if (!draftKey) return;
    const el = textareaRef.current;
    if (!el) return;
    const saved = (() => {
      try {
        return localStorage.getItem(draftKey) ?? "";
      } catch {
        return "";
      }
    })();
    el.value = saved;
    // Trigger field-sizing recompute on the auto-growing textarea.
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, [draftKey]);

  useEffect(() => {
    if (status === "ready") textareaRef.current?.focus();
  }, [status]);

  // Listen for retry requests dispatched from tool cards (e.g. DeepWiki).
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ text?: string }>).detail;
      const text = detail?.text?.trim();
      if (!text) return;
      if (status === "submitted" || status === "streaming") return;
      sendMessage({ text });
    };
    window.addEventListener("weaver:retry", handler);
    return () => window.removeEventListener("weaver:retry", handler);
  }, [sendMessage, status]);

  // Show shimmer while submitted, or while streaming but the assistant
  // message has not produced any text/tool parts yet.
  const lastMessage = messages[messages.length - 1];
  const lastIsAssistantWithContent =
    lastMessage?.role === "assistant" && (lastMessage.parts?.length ?? 0) > 0;
  const showThinking =
    status === "submitted" ||
    (status === "streaming" && !lastIsAssistantWithContent);
  const showStreamingPill = status === "streaming" && lastIsAssistantWithContent;

  // Heuristic progress: track turn start time, derive a monotonic estimate
  // from elapsed time + tool completion + streamed text length.
  const turnStartRef = useRef<number | null>(null);
  const lastProgressRef = useRef(0);
  const [progressTick, setProgressTick] = useState(0);

  useEffect(() => {
    const active = status === "submitted" || status === "streaming";
    if (active && turnStartRef.current === null) {
      turnStartRef.current = Date.now();
      lastProgressRef.current = 0;
    }
    if (!active) {
      turnStartRef.current = null;
      lastProgressRef.current = 0;
      return;
    }
    const id = window.setInterval(() => setProgressTick((t) => t + 1), 250);
    return () => window.clearInterval(id);
  }, [status]);

  const progress = useMemo(() => {
    if (turnStartRef.current === null) return undefined;
    const assistantParts =
      lastMessage?.role === "assistant" ? lastMessage.parts ?? [] : [];
    const toolParts = assistantParts.filter(
      (p) => p.type?.startsWith("tool-") || p.type === "dynamic-tool",
    );
    const toolPartsTotal = toolParts.length;
    const toolPartsDone = toolParts.filter((p) => {
      const state = (p as { state?: string }).state;
      return state === "output-available" || state === "output-error";
    }).length;
    const textLength = assistantParts
      .filter((p) => p.type === "text")
      .reduce((acc, p) => acc + ((p as { text?: string }).text?.length ?? 0), 0);
    const next = estimateWeaverProgress({
      elapsedMs: Date.now() - turnStartRef.current,
      toolPartsTotal,
      toolPartsDone,
      textLength,
      streaming: status === "streaming",
    });
    // Keep it monotonic.
    const clamped = Math.max(lastProgressRef.current, next);
    lastProgressRef.current = clamped;
    return clamped;
    // progressTick drives recomputation on the ticker; lastMessage drives
    // recomputation on every streamed part.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressTick, lastMessage, status]);

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
              <WeaverEmptyState
                onPick={(text) => sendMessage({ text })}
              />
            </ConversationEmptyState>
          ) : null}

          {messages.map((m) => {
            const assistantText =
              m.role === "assistant"
                ? (m.parts ?? [])
                    .filter((p) => p.type === "text")
                    .map((p) => (p as { text?: string }).text ?? "")
                    .join("\n\n")
                    .trim()
                : "";
            const showCopy =
              m.role === "assistant" &&
              assistantText.length > 0 &&
              !(m === lastMessage && (status === "submitted" || status === "streaming"));
            return (
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
                        <WeaverToolPart
                          key={idx}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          part={part as any}
                        />
                      );
                    }
                    return null;
                  })}
                  {showCopy ? (
                    <div className="mt-1 flex justify-start">
                      <CopyResponseButton text={assistantText} />
                    </div>
                  ) : null}
                </MessageContent>
              </Message>
            );
          })}

          {showThinking ? (
            <Message from="assistant">
              <MessageContent className="bg-muted/60">
                <div className="flex flex-col gap-2">
                  <TypingDots aria-label="Assistant is typing" />
                  <WeaverThinking variant="thinking" progress={progress} />
                </div>
              </MessageContent>
            </Message>
          ) : null}

          {showStreamingPill ? (
            <div className="flex items-center gap-2 px-1">
              <TypingDots aria-label="Assistant is typing" />
              <WeaverThinking variant="streaming" progress={progress} className="text-xs" />
            </div>
          ) : null}

          {error ? (() => {
            const parsed = parseWeaverError(error.message);
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
            if (draftKey) localStorage.removeItem(draftKey);
            sendMessage({ text });
          }}
        >
          <PromptInputTextarea
            ref={textareaRef}
            placeholder="Ask the Elsa Weaver… (Enter to send, Shift+Enter for newline)"
            autoFocus
            onInput={(e) => {
              if (!draftKey) return;
              const val = e.currentTarget.value;
              if (val) localStorage.setItem(draftKey, val);
              else localStorage.removeItem(draftKey);
            }}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
