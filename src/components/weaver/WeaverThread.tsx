// WeaverThread: connects useChat to the weaver-chat edge function with the
// user's JWT, renders messages via AI Elements, and exposes tool intents
// to the inline approval renderer.

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { toast } from "sonner";
import { CornerDownLeftIcon, Loader2Icon, PauseIcon, PlayIcon, SquareIcon, XIcon } from "lucide-react";

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
import { estimateWeaverProgress } from "./weaverProgress";
import { CopyResponseButton } from "./CopyResponseButton";
import { WeaverToolPart } from "./WeaverToolPart";
import { WeaverEmptyState } from "./WeaverEmptyState";
import { extractFollowups } from "./followups";
import { FollowupChips } from "./FollowupChips";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { useWeaverPreferences } from "@/lib/weaverPreferences";

const FUNCTIONS_BASE = "https://tehhrjepyfnhmsgtwzkf.supabase.co/functions/v1/weaver-chat";

// Cap on pending prompts behind the active turn. Keeps the thread readable
// and prevents runaway queueing while a long turn is in flight.
const MAX_QUEUE_SIZE = 5;

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

// Focus an element without letting the browser scroll any ancestor (or the
// document) into view. Uses `preventScroll` when supported and snapshots/
// restores scroll positions of all scrollable ancestors as a fallback for
// older Safari/iOS where the option is ignored.
function focusNoScroll(el: HTMLElement) {
  if (typeof document === "undefined") return;
  const scrollables: { node: Element | Window; x: number; y: number }[] = [];
  let parent: Element | null = el.parentElement;
  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflow = `${style.overflow}${style.overflowX}${style.overflowY}`;
    if (/auto|scroll|overlay/.test(overflow)) {
      scrollables.push({ node: parent, x: parent.scrollLeft, y: parent.scrollTop });
    }
    parent = parent.parentElement;
  }
  scrollables.push({ node: window, x: window.scrollX, y: window.scrollY });

  try {
    el.focus({ preventScroll: true });
  } catch {
    el.focus();
  }

  // Restore on next frame too, since Safari/iOS may scroll after focus settles.
  const restore = () => {
    for (const s of scrollables) {
      if (s.node === window) {
        if (window.scrollX !== s.x || window.scrollY !== s.y) {
          window.scrollTo(s.x, s.y);
        }
      } else {
        const n = s.node as Element;
        if (n.scrollLeft !== s.x) n.scrollLeft = s.x;
        if (n.scrollTop !== s.y) n.scrollTop = s.y;
      }
    }
  };
  restore();
  requestAnimationFrame(restore);
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
  const isMobile = useIsMobile();
  const { prefs: weaverPrefs } = useWeaverPreferences();
  // On mobile, respect the user's "auto-scroll on thread switch" preference.
  // When disabled, mount the Conversation with `initial={false}` so the
  // StickToBottom container does not jump to the latest message on the first
  // render after a thread change — the user keeps the scroll at the top and
  // can read the conversation from the beginning.
  const conversationInitial: false | "smooth" =
    isMobile && !weaverPrefs.mobileAutoScrollOnThreadSwitch ? false : "smooth";
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cancelSavedRef = useRef(false);
  // Set the instant a submit is initiated and cleared once useChat's `status`
  // transitions to a non-ready state. Prevents two rapid Enter presses (or
  // Enter + button click) from firing two requests before React/useChat has
  // had a chance to flip `status` to "submitted".
  const submitLockRef = useRef(false);
  const [hasText, setHasText] = useState(false);
  // Pending prompts entered while a turn is still in flight. They render as
  // user-style bubbles with a "Queued" indicator and drain one-at-a-time as
  // soon as the assistant returns to `ready`.
  const [queue, setQueue] = useState<{ id: string; text: string; paused?: boolean }[]>([]);

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
  // Extra care for iOS/Safari: programmatic focus is blocked outside a user
  // gesture (the on-screen keyboard won't open), but the caret can still be
  // placed reliably if we (a) wait until the element is laid out and visible,
  // (b) skip when another field is intentionally focused, and (c) snapshot &
  // restore scroll positions to prevent the page/chat container from jumping
  // (older Safari ignores `preventScroll`, and iOS scrolls the document into
  // view for the soft keyboard).
  useEffect(() => {
    let cancelled = false;
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isIOS = /iPad|iPhone|iPod/.test(ua) ||
      // iPadOS 13+ reports as Mac; sniff touch support to detect.
      (/Macintosh/.test(ua) && typeof document !== "undefined" &&
        "ontouchend" in document);

    const isElementInViewport = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const vw = window.innerWidth || document.documentElement.clientWidth;
      // Require the element to be fully within the viewport before we touch
      // focus on iOS — otherwise Safari will scroll it into view even with
      // `preventScroll`, jumping the page under the user.
      return rect.top >= 0 && rect.left >= 0 && rect.bottom <= vh && rect.right <= vw;
    };

    const tryFocus = () => {
      if (cancelled) return false;
      const el = textareaRef.current;
      if (!el) return false;
      // Bail if the element isn't in the DOM or has zero size yet (Sheet
      // animating in). The next retry will catch it.
      if (!el.isConnected) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return false;

      // Don't steal focus if the user has already tapped into another input
      // (common on iOS where the keyboard is up for a different field).
      const active = document.activeElement as HTMLElement | null;
      const alreadyFocused = active === el;
      if (
        active &&
        !alreadyFocused &&
        active !== document.body &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.isContentEditable)
      ) {
        return true;
      }

      const len = el.value.length;
      const placeCaret = () => {
        try {
          el.setSelectionRange(len, len);
        } catch {
          /* ignore non-text inputs */
        }
      };

      if (isIOS) {
        // On iOS the soft keyboard only opens from a real user gesture, so
        // programmatic focus offers no UX win — but it *can* scroll the
        // document or any ancestor scroll container to bring the textarea
        // into view (Safari ignores `preventScroll` in many versions). To
        // avoid that jump on thread switch:
        //   - if the textarea is already focused, just move the caret;
        //   - if it's fully on-screen, focus with scroll-snapshot fallback;
        //   - otherwise, leave focus alone and let the next user tap handle it.
        if (alreadyFocused) {
          placeCaret();
          return true;
        }
        if (!isElementInViewport(el)) {
          return true; // treat as "handled" — don't keep retrying
        }
        focusNoScroll(el);
        queueMicrotask(placeCaret);
        requestAnimationFrame(placeCaret);
        return document.activeElement === el;
      }

      focusNoScroll(el);
      placeCaret();
      return document.activeElement === el;
    };

    // Schedule retries via rAF (paints) plus a couple of timeouts to cover
    // the Sheet open animation. Stop early once focus actually lands.
    const rafIds: number[] = [];
    const timeouts: number[] = [];
    const schedule = (fn: () => void, delay: number) => {
      if (delay === 0) {
        rafIds.push(requestAnimationFrame(fn));
      } else {
        timeouts.push(window.setTimeout(fn, delay));
      }
    };
    const attempt = () => {
      if (tryFocus()) return;
    };
    [0, 60, 180, 360, 600].forEach((d) => schedule(attempt, d));

    return () => {
      cancelled = true;
      rafIds.forEach((id) => cancelAnimationFrame(id));
      timeouts.forEach((t) => window.clearTimeout(t));
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
    setHasText(saved.trim().length > 0);
    // Trigger field-sizing recompute on the auto-growing textarea.
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, [draftKey]);

  useEffect(() => {
    if (status === "ready" && textareaRef.current) focusNoScroll(textareaRef.current);
    // Once useChat has taken ownership of the request (any non-ready state),
    // it's safe to release the lock — subsequent submits will be gated by
    // `status` itself.
    if (status !== "ready") submitLockRef.current = false;
  }, [status]);

  // Drain the queued prompts one at a time whenever the assistant is idle.
  // Paused items stay in place — we send the first *unpaused* item and leave
  // any paused entries ahead of it untouched so their position is preserved.
  useEffect(() => {
    if (status !== "ready") return;
    if (queue.length === 0) return;
    const nextIdx = queue.findIndex((item) => !item.paused);
    if (nextIdx === -1) return;
    const next = queue[nextIdx];
    setQueue((cur) => cur.filter((_, i) => i !== nextIdx));
    submitLockRef.current = true;
    sendMessage({ text: next.text });
  }, [status, queue, sendMessage]);

  // Per-thread queue persistence. Queued prompts belong to the thread they
  // were typed against, so we key the localStorage entry by `threadId` and
  // restore on mount / thread switch. The drain effect picks up restored
  // items as soon as the assistant is idle.
  const queueKey = threadId ? `weaver:queue:${threadId}` : null;
  const queueHydratedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!queueKey) {
      setQueue([]);
      queueHydratedRef.current = null;
      return;
    }
    let restored: { id: string; text: string; paused?: boolean }[] = [];
    try {
      const raw = localStorage.getItem(queueKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          restored = parsed
            .filter(
              (it): it is { id: string; text: string; paused?: boolean } =>
                !!it &&
                typeof it === "object" &&
                typeof (it as { id?: unknown }).id === "string" &&
                typeof (it as { text?: unknown }).text === "string",
            )
            .map((it) => ({
              id: it.id,
              text: it.text,
              paused: (it as { paused?: unknown }).paused === true,
            }))
            .slice(0, MAX_QUEUE_SIZE);
        }
      }
    } catch {
      /* corrupt entry — ignore and start fresh */
    }
    setQueue(restored);
    queueHydratedRef.current = queueKey;
  }, [queueKey]);

  // Mirror queue → localStorage. Guarded by `queueHydratedRef` so we don't
  // overwrite a saved queue with the transient `[]` of the previous thread
  // before the hydration effect above has run for the new thread.
  useEffect(() => {
    if (!queueKey) return;
    if (queueHydratedRef.current !== queueKey) return;
    try {
      if (queue.length === 0) localStorage.removeItem(queueKey);
      else localStorage.setItem(queueKey, JSON.stringify(queue));
    } catch {
      /* quota / privacy mode — non-fatal */
    }
  }, [queue, queueKey]);

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

  const lastMessage = messages[messages.length - 1];

  // Live token-ish count from the streaming assistant message. Word count is
  // a stable, model-agnostic proxy that updates as new chunks arrive.
  const streamedWords = useMemo(() => {
    if (status !== "streaming" && status !== "submitted") return 0;
    if (lastMessage?.role !== "assistant") return 0;
    const text = (lastMessage.parts ?? [])
      .filter((p) => p.type === "text")
      .map((p) => (p as { text?: string }).text ?? "")
      .join(" ")
      .trim();
    if (!text) return 0;
    // Strip the followups marker so its JSON doesn't inflate the count.
    const clean = text.replace(/<!--\s*followups[\s\S]*?-->/i, "");
    const words = clean.match(/\S+/g);
    return words ? words.length : 0;
  }, [lastMessage, status]);

  // Heuristic progress: track turn start time, derive a monotonic estimate
  // from elapsed time + tool completion + streamed text length. The
  // *displayed* value is then eased toward the target via rAF so the bar
  // never jumps backward and animates smoothly between samples.
  const turnStartRef = useRef<number | null>(null);
  const turnIdRef = useRef(0);
  const lastProgressRef = useRef(0);
  const [progressTick, setProgressTick] = useState(0);
  const [displayedProgress, setDisplayedProgress] = useState<number | undefined>(
    undefined,
  );
  const displayedRef = useRef(0);
  const targetRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const active = status === "submitted" || status === "streaming";
    if (active && turnStartRef.current === null) {
      turnStartRef.current = Date.now();
      turnIdRef.current += 1;
      lastProgressRef.current = 0;
      displayedRef.current = 0;
      targetRef.current = 0;
      setDisplayedProgress(0);
    }
    if (!active) {
      turnStartRef.current = null;
      lastProgressRef.current = 0;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      // Leave the last displayed value in place — the bar unmounts on its
      // own when the turn ends; this avoids a visible snap-to-zero flash.
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
    // Keep the target monotonic per turn.
    const clamped = Math.max(lastProgressRef.current, next);
    lastProgressRef.current = clamped;
    return clamped;
    // progressTick drives recomputation on the ticker; lastMessage drives
    // recomputation on every streamed part.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressTick, lastMessage, status]);

  // Smooth the displayed value toward the latest target using a fixed
  // exponential ease. Monotonic: we only ever increase displayedRef.
  useEffect(() => {
    if (typeof progress !== "number") return;
    targetRef.current = Math.max(targetRef.current, progress);
    if (rafRef.current !== null) return;
    const step = () => {
      const target = targetRef.current;
      const current = displayedRef.current;
      const delta = target - current;
      if (delta < 0.0015) {
        displayedRef.current = target;
        setDisplayedProgress(target);
        rafRef.current = null;
        return;
      }
      // Ease ~12% of remaining distance per frame → smooth but responsive.
      const nextVal = current + delta * 0.12;
      displayedRef.current = nextVal;
      setDisplayedProgress(nextVal);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, [progress]);

  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  // Screen-reader announcement for weaving state transitions. We mirror
  // status into a debounced string so assistive tech hears clear, discrete
  // updates ("Weaving response…", "Streaming reply…", "Reply ready.")
  // rather than the raw progress numbers.
  const [srStatus, setSrStatus] = useState("");
  const prevStatusRef = useRef<typeof status | null>(null);
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;
    if (status === "submitted") {
      setSrStatus("Weaving response. Please wait.");
    } else if (status === "streaming") {
      setSrStatus("Streaming reply.");
    } else if (status === "error") {
      setSrStatus("Generation failed.");
    } else if (
      (prev === "streaming" || prev === "submitted") &&
      (status === "ready" || status === "idle")
    ) {
      setSrStatus("Reply ready.");
    }
  }, [status]);


  return (
    <div className="flex h-full flex-col">
      <Conversation className="flex-1" initial={conversationInitial}>
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

          {(() => {
            let lastUserIdx = -1;
            for (let i = messages.length - 1; i >= 0; i--) {
              if (messages[i].role === "user") { lastUserIdx = i; break; }
            }
            const isBusy = status === "submitted" || status === "streaming";
            const lastIsUser =
              messages.length > 0 &&
              messages[messages.length - 1].role === "user";
            return messages.map((m, mIdx) => {
              const rawAssistantText =
                m.role === "assistant"
                  ? (m.parts ?? [])
                      .filter((p) => p.type === "text")
                      .map((p) => (p as { text?: string }).text ?? "")
                      .join("\n\n")
                      .trim()
                  : "";
              const { clean: assistantText, followups } =
                m.role === "assistant"
                  ? extractFollowups(rawAssistantText)
                  : { clean: "", followups: [] as string[] };
              const isLast = m === lastMessage;
              const isStreamingThis =
                isLast && (status === "submitted" || status === "streaming");
              const showCopy =
                m.role === "assistant" &&
                assistantText.length > 0 &&
                !isStreamingThis;
              const showFollowups =
                m.role === "assistant" &&
                isLast &&
                !isStreamingThis &&
                followups.length > 0;
              // Show a "Sent" status under the most recent user message while
              // we're waiting for / receiving the assistant's response, so the
              // user always sees the prompt they just submitted alongside its
              // delivery state.
              const showSentStatus =
                m.role === "user" && mIdx === lastUserIdx && isBusy && lastIsUser;
              const sentLabel = (() => {
                const base =
                  status === "submitted"
                    ? "Sent · waiting for reply…"
                    : "Sent · streaming reply…";
                return queue.length > 0
                  ? `${base} · ${queue.length} queued after this`
                  : base;
              })();
              return (
                <div key={m.id} className="flex flex-col">
                  <Message from={m.role === "user" ? "user" : "assistant"}>
                    <MessageContent
                      className={
                        m.role === "user"
                          ? "group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground"
                          : "bg-transparent p-0"
                      }
                    >
                      {(() => {
                        // Move navigate-intent tool parts to the bottom of
                        // the message so the explanatory text always appears
                        // above the call-to-action button. Other tool parts
                        // (searchKnowledge, rb_*, etc.) keep their streamed
                        // order so reasoning and confirmations stay in place.
                        const parts = m.role === "assistant"
                          ? [...m.parts].sort((a, b) => {
                              const aNav = a.type === "tool-navigate" ? 1 : 0;
                              const bNav = b.type === "tool-navigate" ? 1 : 0;
                              return aNav - bNav;
                            })
                          : m.parts;
                        return parts.map((part, idx) => {
                        if (part.type === "text") {
                          const text = m.role === "assistant"
                            ? extractFollowups((part as { text: string }).text).clean
                            : (part as { text: string }).text;
                          if (!text) return null;
                          return (
                            <MessageResponse key={idx}>{text}</MessageResponse>
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
                        });
                      })()}
                      {showCopy ? (
                        <div className="mt-1 flex justify-start">
                          <CopyResponseButton text={assistantText} />
                        </div>
                      ) : null}
                      {showFollowups ? (
                        <FollowupChips
                          followups={followups}
                          disabled={isBusy}
                          onPick={(text) => sendMessage({ text })}
                        />
                      ) : null}
                    </MessageContent>
                  </Message>
                  {showSentStatus ? (
                    <div
                      className="mt-1 flex items-center justify-end gap-1.5 pr-1 text-[11px] text-muted-foreground"
                      aria-live="polite"
                      role="status"
                    >
                      <Loader2Icon className="size-3 animate-spin" aria-hidden />
                      <span>{sentLabel}</span>
                    </div>
                  ) : null}
                </div>
              );
            });
          })()}

          {(() => {
            const isBusy = status === "submitted" || status === "streaming";
            if (!isBusy) return null;
            const last = messages[messages.length - 1];
            const lastHasContent =
              last?.role === "assistant" &&
              (last.parts ?? []).some((p) => {
                if (p.type === "text") {
                  return ((p as { text?: string }).text ?? "").trim().length > 0;
                }
                return p.type?.startsWith("tool-") || p.type === "dynamic-tool";
              });
            if (lastHasContent) return null;
            return (
              <Message from="assistant" aria-hidden>
                <MessageContent className="bg-transparent p-0">
                  <div
                    className="flex flex-col gap-2 py-1"
                    role="status"
                    aria-label="Assistant is weaving a response"
                  >
                    <Skeleton className="h-3 w-[72%] rounded-full" />
                    <Skeleton className="h-3 w-[88%] rounded-full" />
                    <Skeleton className="h-3 w-[54%] rounded-full" />
                  </div>
                </MessageContent>
              </Message>
            );
          })()}

          {(() => {
            const nextUnpausedIdx = queue.findIndex((it) => !it.paused);
            return queue.map((q, qIdx) => {
              const isPaused = q.paused === true;
              const isNextUp = qIdx === nextUnpausedIdx;
              const remaining = queue.length;
              const statusLabel = isPaused
                ? `Paused · #${qIdx + 1} of ${remaining} · won't send until resumed`
                : isNextUp
                  ? `Next up · sends after the current reply${
                      remaining > 1 ? ` · ${remaining - 1} more queued` : ""
                    }`
                  : `Queued · #${qIdx + 1} of ${remaining} remaining`;
              return (
                <div key={q.id} className="flex flex-col">
                  <Message from="user">
                    <MessageContent
                      className={
                        isPaused
                          ? "group-[.is-user]:bg-primary/40 group-[.is-user]:text-primary-foreground group-[.is-user]:opacity-80"
                          : "group-[.is-user]:bg-primary/70 group-[.is-user]:text-primary-foreground"
                      }
                    >
                      <MessageResponse>{q.text}</MessageResponse>
                    </MessageContent>
                  </Message>
                  <div
                    className="mt-1 flex items-center justify-end gap-1.5 pr-1 text-[11px] text-muted-foreground"
                    aria-live="polite"
                    role="status"
                  >
                    {isPaused ? (
                      <PauseIcon className="size-3" aria-hidden />
                    ) : (
                      <Loader2Icon className="size-3 animate-spin" aria-hidden />
                    )}
                    <span>{statusLabel}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setQueue((cur) =>
                          cur.map((item) =>
                            item.id === q.id
                              ? { ...item, paused: !item.paused }
                              : item,
                          ),
                        )
                      }
                      className="ml-1 inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      aria-label={
                        isPaused
                          ? `Resume queued prompt ${qIdx + 1} of ${remaining}`
                          : `Pause queued prompt ${qIdx + 1} of ${remaining}`
                      }
                      title={isPaused ? "Resume" : "Pause"}
                    >
                      {isPaused ? (
                        <PlayIcon className="size-3" aria-hidden />
                      ) : (
                        <PauseIcon className="size-3" aria-hidden />
                      )}
                      <span>{isPaused ? "Resume" : "Pause"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setQueue((cur) => cur.filter((item) => item.id !== q.id))
                      }
                      className="ml-1 inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      aria-label={`Remove queued prompt ${qIdx + 1} of ${remaining}`}
                      title="Remove from queue"
                    >
                      <XIcon className="size-3" aria-hidden />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              );
            });
          })()}

          {/* The bottom streaming progress bar + footer status already convey
              "thinking" and "streaming" state, so we don't render an extra
              in-conversation typing/progress row here — it would duplicate
              the indicator and clutter the thread. */}

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

      {/* Live streaming progress bar — themed, slim, and only visible while
          a turn is in flight. Sits flush above the composer's top border. */}
      {(status === "submitted" || status === "streaming") ? (
        <div className="px-3 pt-2 pb-1.5 bg-background">
          <div
            className="relative h-1 w-full overflow-hidden rounded-full bg-primary/10"
            role="progressbar"
            aria-label="Assistant response progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={
              typeof progress === "number" ? Math.round(progress * 100) : undefined
            }
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary/70 via-primary to-primary/70 shadow-[0_0_8px_hsl(var(--primary)/0.45)] will-change-[width]"
              style={{
                width: `${Math.max(4, Math.min(98, (displayedProgress ?? 0.04) * 100))}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      {/* Polite live region announces weaving/streaming state changes for
          screen-reader users. Visually hidden; the visible progress bar +
          inline statuses cover sighted users. */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {srStatus}
      </div>

      <div className="border-t bg-background p-3">
        <PromptInput
          onSubmit={(message) => {
            const text = message.text?.trim();
            if (!text) return;
            const isBusyNow =
              submitLockRef.current ||
              status === "submitted" ||
              status === "streaming" ||
              queue.length > 0;
            if (isBusyNow) {
              if (queue.length >= MAX_QUEUE_SIZE) {
                // Refuse the enqueue but keep the draft so the user doesn't
                // lose what they typed — they can resend once the queue drains.
                toast.error(
                  `Queue is full (${MAX_QUEUE_SIZE} prompts max). Wait for one to send, then try again.`,
                );
                return;
              }
              if (draftKey) localStorage.removeItem(draftKey);
              setHasText(false);
              // Enqueue — the drain effect picks it up the moment the
              // current turn finishes. Each queued bubble renders its own
              // "Queued · position N of M" indicator.
              setQueue((q) => [
                ...q,
                {
                  id:
                    typeof crypto !== "undefined" && "randomUUID" in crypto
                      ? crypto.randomUUID()
                      : `${Date.now()}-${Math.random()}`,
                  text,
                },
              ]);
              return;
            }
            if (draftKey) localStorage.removeItem(draftKey);
            setHasText(false);
            // Double-submit guard: a second rapid Enter (or Enter + click)
            // can race the React state flip to "submitted". The ref is
            // synchronous, so the second call sees it set and bails.
            submitLockRef.current = true;
            sendMessage({ text });
          }}
        >
          <PromptInputTextarea
            ref={textareaRef}
            placeholder={
              queue.length >= MAX_QUEUE_SIZE
                ? `Queue full (${MAX_QUEUE_SIZE} max) — wait for one to send`
                : status === "submitted"
                  ? "Sending… (type more to queue)"
                  : status === "streaming" || queue.length > 0
                    ? "Streaming… (type more to queue)"
                    : "Ask the Elsa Weaver… (⌘/Ctrl+Enter to send, Shift+Enter for newline)"
            }
            onInput={(e) => {
              const val = e.currentTarget.value;
              setHasText(val.trim().length > 0);
              if (!draftKey) return;
              if (val) localStorage.setItem(draftKey, val);
              else localStorage.removeItem(draftKey);
            }}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                (e.metaKey || e.ctrlKey) &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                if (e.currentTarget.value.trim().length === 0) return;
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <PromptInputFooter className="justify-between gap-2">
            <span
              className="flex items-center gap-2 text-xs tabular-nums text-muted-foreground"
              aria-live="polite"
              role="status"
            >
              {status === "submitted" ? (
                <>
                  <Loader2Icon className="size-3 animate-spin" aria-hidden />
                  <span>
                    Sending…
                    {typeof progress === "number"
                      ? ` ${Math.round(progress * 100)}%`
                      : ""}
                  </span>
                </>
              ) : status === "streaming" ? (
                <>
                  <Loader2Icon className="size-3 animate-spin" aria-hidden />
                  <span>
                    Streaming
                    {typeof progress === "number"
                      ? ` · ${Math.round(progress * 100)}%`
                      : ""}
                    {streamedWords > 0
                      ? ` · ${streamedWords} word${streamedWords === 1 ? "" : "s"}`
                      : ""}
                  </span>
                </>
              ) : queue.length > 0 ? (
                <>
                  <Loader2Icon className="size-3 animate-spin" aria-hidden />
                  <span>
                    {queue.length} prompt{queue.length === 1 ? "" : "s"} queued
                  </span>
                </>
              ) : (
                ""
              )}
            </span>
            <PromptInputSubmit
              status={status}
              onStop={stop}
              size="sm"
              aria-label="Send message"
              disabled={
                !hasText && status !== "submitted" && status !== "streaming"
              }
            >
              {status === "submitted" ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  <span>Sending…</span>
                </>
              ) : status === "streaming" ? (
                <>
                  <SquareIcon className="size-4" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <span>Send</span>
                  <CornerDownLeftIcon className="size-4" />
                </>
              )}
            </PromptInputSubmit>
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
