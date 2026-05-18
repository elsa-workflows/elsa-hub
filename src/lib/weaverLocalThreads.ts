// LocalStorage-backed Weaver threads for anonymous users.
// Signed-in users use the DB-backed weaver_threads / weaver_messages tables.

import type { UIMessage } from "ai";

const THREADS_KEY = "weaver:anon:threads";
const messagesKey = (id: string) => `weaver:anon:messages:${id}`;

export interface LocalThreadMeta {
  id: string;
  title: string;
  last_message_at: string;
}

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

export function listLocalThreads(): LocalThreadMeta[] {
  const items = safeRead<LocalThreadMeta[]>(THREADS_KEY, []);
  return [...items].sort((a, b) =>
    a.last_message_at < b.last_message_at ? 1 : -1,
  );
}

export function getLocalMessages(threadId: string): UIMessage[] {
  return safeRead<UIMessage[]>(messagesKey(threadId), []);
}

export function deriveThreadTitle(messages: UIMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (firstUser) {
    const text = (firstUser.parts ?? [])
      .filter((p) => p.type === "text")
      .map((p) => (p as { text: string }).text)
      .join(" ")
      .trim();
    if (text) return text.slice(0, 60);
  }
  return "New conversation";
}

export function saveLocalThread(threadId: string, messages: UIMessage[]) {
  if (typeof window === "undefined") return;
  if (messages.length === 0) return;
  safeWrite(messagesKey(threadId), messages);
  const meta = safeRead<LocalThreadMeta[]>(THREADS_KEY, []);
  const next: LocalThreadMeta = {
    id: threadId,
    title: deriveThreadTitle(messages),
    last_message_at: new Date().toISOString(),
  };
  const idx = meta.findIndex((t) => t.id === threadId);
  if (idx >= 0) meta[idx] = next;
  else meta.unshift(next);
  safeWrite(THREADS_KEY, meta);
  // Notify same-tab listeners (storage events only fire cross-tab).
  window.dispatchEvent(new CustomEvent("weaver:anon:threads-changed"));
}

export function deleteLocalThread(threadId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(messagesKey(threadId));
  } catch {
    // ignore
  }
  const meta = safeRead<LocalThreadMeta[]>(THREADS_KEY, []);
  safeWrite(
    THREADS_KEY,
    meta.filter((t) => t.id !== threadId),
  );
  window.dispatchEvent(new CustomEvent("weaver:anon:threads-changed"));
}
