# Integrate DeepWiki via MCP into Weaver

Today `recommendDeepWiki` only produces a link card with a `?q=` querystring that DeepWiki's site doesn't actually consume. We'll replace that with real calls to the public DeepWiki MCP server (`https://mcp.deepwiki.com/mcp`) so Weaver can answer code‑level questions inline, with a link to the underlying wiki page as a citation.

The DeepWiki MCP server is public and unauthenticated, so we don't need the full MCP connection registry / OAuth flow from the AI SDK MCP knowledge — a short‑lived MCP client per chat turn is sufficient.

## Scope

Edge function `supabase/functions/weaver-chat/index.ts` and the Weaver UI intent rendering only. No DB changes, no new secrets, no frontend routing changes (the existing top‑nav / footer DeepWiki links stay as-is — they're fine as a general entry point).

## Technical plan

1. **Add MCP client dependency in the edge function**
   - Import `experimental_createMCPClient` from `npm:ai@^5` (AI SDK ships an MCP client; no extra package needed).
   - Add a small helper `withDeepWikiMcp<T>(fn)` that:
     - Creates a Streamable HTTP MCP client pointing at `https://mcp.deepwiki.com/mcp`.
     - Calls `await client.tools()` to load the three DeepWiki tools (`read_wiki_structure`, `read_wiki_contents`, `ask_question`).
     - Runs `fn(tools)` and closes the client in `finally` (so we never leak connections, per the MCP knowledge file).

2. **Expose DeepWiki tools to the model**
   - In `buildAnonymousTools`, register three new AI SDK tools that wrap the MCP tools so the model sees a stable surface even if the underlying MCP names change:
     - `deepwikiAsk({ question, repo? })` → calls MCP `ask_question` with `repoName = "elsa-workflows/<repo>"` (default `elsa-core`). Returns `{ answer, citations: [{ title, url }] }`.
     - `deepwikiReadStructure({ repo? })` → MCP `read_wiki_structure`. Returns the page list so the model can pick a specific page.
     - `deepwikiReadPage({ repo?, page })` → MCP `read_wiki_contents` for one page. Returns markdown.
   - Each wrapper opens/closes its own short‑lived MCP client (simple, stateless, matches existing tool style).
   - Cap response size (truncate to ~6 KB) so we don't blow the context window on big wiki pages.

3. **Replace `recommendDeepWiki` semantics**
   - Keep the tool name for backward compatibility but change its behavior: instead of returning a `deepwiki` link intent, it now internally calls `deepwikiAsk` and returns the answer + citations, plus a `kind: "deepwiki"` intent pointing at the most relevant citation URL (no `?q=`). The UI card then says "Answered from DeepWiki — open page" rather than "Ask DeepWiki".
   - Update the system prompt:
     - "For code‑level questions, call `deepwikiAsk` (preferred) and quote the answer with citations. Use `deepwikiReadStructure` + `deepwikiReadPage` when you need to browse specific pages. The old `recommendDeepWiki` is deprecated — prefer `deepwikiAsk`."

4. **UI intent rendering** (`src/components/weaver/WeaverToolPart.tsx`, `src/lib/weaver/intents.ts`)
   - Extend `DeepWikiIntent` with optional `citations?: { title: string; url: string }[]`.
   - When citations exist, render them as a small list under the answer instead of a single "Ask DeepWiki" button.
   - Drop the `?q=...` querystring from any URL we render (it was never honored by deepwiki.com).

5. **Error / fallback**
   - If the MCP call fails (network, 5xx, timeout > 15s), the tool returns `{ error, fallbackUrl: "https://deepwiki.com/elsa-workflows/<repo>" }` and the model is instructed to surface the fallback link.

## Files to change

- `supabase/functions/weaver-chat/index.ts` — add MCP helper + three tools, rewrite `recommendDeepWiki`, update system prompt.
- `src/lib/weaver/intents.ts` — extend `DeepWikiIntent` with `citations`.
- `src/components/weaver/WeaverToolPart.tsx` — render citations list, drop `?q=`.

## Out of scope

- No changes to the static DeepWiki links in `Navigation.tsx`, `Footer.tsx`, `DashboardHeader.tsx`, `Resources.tsx`, `Home.tsx` (those are general entry points, not Weaver answers).
- No MCP connection registry / OAuth — the DeepWiki MCP server is public.
- No new secrets.

## Open question

Should `deepwikiAsk` also be available to unauthenticated visitors (current behavior of `recommendDeepWiki`), or gated to signed‑in users to avoid spamming DeepWiki's free public MCP? Default in this plan: keep it anonymous, same as today.
