// CopilotThread: connects useChat to the copilot-chat edge function with the
// user's JWT, renders messages via AI Elements, and exposes tool intents
// to the inline approval renderer.

import { useEffect, useMemo, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Loader2 } from "lucide-react";
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

const FUNCTIONS_BASE = (() => {
  // Derive functions URL from the configured supabase URL
  const url = (supabase as unknown as { supabaseUrl: string }).supabaseUrl;
  return `${url}/functions/v1/copilot-chat`;
})();

interface CopilotThreadProps {
  threadId: string;
  initialMessages?: UIMessage[];
}

export function CopilotThread({ threadId, initialMessages }: CopilotThreadProps) {
  const { session } = useAuth();
  const { routeContext } = useCopilot();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
  });

  // Focus management
  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId]);

  useEffect(() => {
    if (status === "ready") textareaRef.current?.focus();
  }, [status]);

  const isStreaming = status === "submitted" || status === "streaming";

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

          {status === "submitted" ? (
            <Message from="assistant">
              <MessageContent variant="flat">
                <Shimmer>Thinking…</Shimmer>
              </MessageContent>
            </Message>
          ) : null}

          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error.message}
            </div>
          ) : null}
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
            <PromptInputSubmit
              status={status}
              disabled={isStreaming ? false : undefined}
              onStop={stop}
              size="icon-sm"
            >
              {status === "streaming" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : undefined}
            </PromptInputSubmit>
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
