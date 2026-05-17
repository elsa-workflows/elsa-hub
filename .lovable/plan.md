# Weaver ↔ DeepWiki escalation (no repo ingestion)

Per your decision, we will **not** ingest `elsa-core`, `elsa-studio`, or `elsa-extensions` into `weaver_documents`. Instead, Weaver will recognize code-level questions and hand them off to DeepWiki, which already indexes those repos with high quality.

This keeps embedding costs flat, avoids a job-queue/refresh infrastructure, and reuses an integration you already have.

## Scope

Three small, surgical changes — all in the Weaver edge function and ingest pipeline. No schema changes, no new tables, no new cron jobs.

### 1. Add a `recommendDeepWiki` tool to `weaver-chat`

A new tool the model can call when a question is about C# code, internal class behavior, source-level "how does X work under the hood", contributor questions, or anything not covered by the curated knowledge base.

The tool returns a structured intent the existing UI tool-rendering layer can display as a clickable card (same pattern as the existing `navigate` tool). It does not navigate automatically.

Input:
- `query` — the user's original question, URL-encoded for the DeepWiki search param
- `repo` — one of `elsa-core` | `elsa-studio` | `elsa-extensions` (model picks based on context; defaults to `elsa-core`)
- `reason` — one-line justification shown on the card

Output:
- `kind: "deepwiki"`, `url: "https://deepwiki.com/elsa-workflows/<repo>?q=..."`, `label`, `reason`

### 2. Extend the system prompt

Add two short rules to `SYSTEM_PROMPT` in `supabase/functions/weaver-chat/index.ts`:

- "For questions about Elsa source code, internal implementation, class behavior, or contributor-level details, call `recommendDeepWiki` instead of guessing or apologizing. DeepWiki is the authoritative AI index of the `elsa-core`, `elsa-studio`, and `elsa-extensions` repositories."
- "Do not invent code references, class names, or method signatures. If `searchKnowledge` does not return relevant content and the question is code-level, escalate to `recommendDeepWiki`."

### 3. Add a curated FAQ doc pointing to DeepWiki

Add one entry to `FAQ_DOCS` in `supabase/functions/weaver-ingest/index.ts` so semantic search itself also surfaces DeepWiki as a destination when users ask things like "is there a code search?" or "where do I read the source?". Title: "Exploring the Elsa source code". Body explains DeepWiki covers the three repos and links to `https://deepwiki.com/elsa-workflows/elsa-core`.

Then run the ingest function once (admin button or curl) to refresh embeddings.

## Why this and not RAG-over-source

- DeepWiki already does the expensive part (LLM-summarized code graph) for free.
- A full repo ingest would mean: GitHub tree walking, commit-SHA delta tracking, a job queue (edge functions have a ~150s wall-clock limit), hundreds of thousands of embedding calls per refresh, and ~600 MB+ of vectors. All for a feature DeepWiki already does better.
- This approach keeps Weaver focused on what only it can do: account-aware answers, runtime-builder actions, and product/commerce context.

## Files touched

- `supabase/functions/weaver-chat/index.ts` — add `recommendDeepWiki` tool, register it in both `buildAnonymousTools` and (if relevant) the authenticated tool set, extend `SYSTEM_PROMPT`.
- `supabase/functions/weaver-ingest/index.ts` — append one FAQ doc.
- `src/components/weaver/WeaverToolPart.tsx` — add a render branch for `kind: "deepwiki"` (external-link card, opens in new tab). Visual style matches the existing `navigate` card.

## Out of scope

- Any GitHub API integration.
- Any change to `weaver_documents` schema or RLS.
- Any UI surface outside the Weaver chat panel.
- Adding repo content to the curated `PAGE_DOCS` list.

## Acceptance

- Asking Weaver "how does the bookmark store work in Elsa?" produces a card linking to `https://deepwiki.com/elsa-workflows/elsa-core?q=how%20does%20the%20bookmark%20store%20work` with a one-line reason.
- Asking "what bundles do you sell?" still uses `searchKnowledge` + `listBundles` and does NOT escalate to DeepWiki.
- Asking "where can I read the Elsa source?" surfaces the new FAQ entry via semantic search.
