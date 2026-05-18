// Utilities for the trailing `<!--followups: [...] -->` block emitted by the
// Weaver system prompt. The marker is hidden from rendered text and parsed
// into clickable chip suggestions.

const FOLLOWUPS_RE = /<!--\s*followups\s*:\s*(\[[\s\S]*?\])\s*-->/i;

export function extractFollowups(text: string): {
  clean: string;
  followups: string[];
} {
  if (!text) return { clean: "", followups: [] };
  const match = text.match(FOLLOWUPS_RE);
  if (!match) return { clean: text, followups: [] };
  let followups: string[] = [];
  try {
    const parsed = JSON.parse(match[1]);
    if (Array.isArray(parsed)) {
      followups = parsed
        .filter((v): v is string => typeof v === "string")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .slice(0, 3);
    }
  } catch {
    /* ignore malformed payloads */
  }
  const clean = text.replace(FOLLOWUPS_RE, "").trimEnd();
  return { clean, followups };
}
