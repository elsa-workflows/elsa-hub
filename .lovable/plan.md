# Elsa Copilot — site-wide AI assistant

A floating launcher (bottom-right) opens a slide-over chat panel on every page. Anonymous users get a limited Q&A mode over public content; signed-in users unlock account/dashboard/Runtime Builder tools. Conversations are threaded and persisted in Lovable Cloud.

## Stack

- **AI SDK** (`ai`, `@ai-sdk/react`, `@ai-sdk/openai-compatible`) on a Supabase Edge Function (`copilot-chat`) talking to **Lovable AI Gateway** with `google/gemini-3-flash-preview`.
- **AI Elements** (`conversation`, `message`, `prompt-input`, `tool`, `shimmer`) for the chat surface.
- Streaming via `streamText` + `toUIMessageStreamResponse`; client uses `useChat` with `DefaultChatTransport`.
- Vector grounding via **pgvector** in the existing Supabase project.

## UX

- **Launcher**: floating button bottom-right, hidden on `/auth` and embedded checkout flows.
- **Panel**: right-side `Sheet` (sm: 480px, lg: 560px), full-height, glassmorphism per Deep Noir.
- **Header**: thread title, "New chat" + thread switcher (popover list), close.
- **Empty state**: domain identity (custom small Elsa+ mark, not Sparkles), 4 suggested prompts that vary by route (e.g. on `/elsa-plus/expert-services`: "Compare Implementation vs Advisory bundles"; in `/dashboard`: "How many credits do we have left?"; in Runtime Builder: "Add Identity with OpenIddict and Postgres").
- **Composer**: `PromptInput` + `PromptInputTextarea` + `PromptInputFooter` (right-aligned `PromptInputSubmit`). Auto-focused on open, after send, after thread switch.
- **Messages**: assistant text on transparent surface, user messages in `primary`/`primary-foreground` bubble, markdown via `MessageResponse`.
- **Tool calls**: rendered with `Tool` accordion (closed by default) + custom compact renderers for the most-used tools (e.g. credit balance card, bundle card, builder diff).
- **Write actions** show an inline confirmation card ("Add `Elsa.Workflows.Identity` and select OpenIddict?") with Confirm / Cancel before the tool executes.

## Threads & persistence

Dedicated route `/copilot/:threadId` for full-page view; the side panel reads/writes the same threads. Tables (new):

- `copilot_threads(id, user_id, title, last_message_at, route_context jsonb, created_at, updated_at)`
- `copilot_messages(id, thread_id, role, parts jsonb, created_at)` — DB-generated UUIDs; AI SDK `msg_...` ids stored only if needed.

RLS: user sees only their own threads/messages. Save assistant messages from `onFinish` of `toUIMessageStreamResponse`.

## Grounding (RAG)

- `copilot_documents(id, source, url, title, body, metadata jsonb, embedding vector(1536), updated_at)` with HNSW index.
- `match_copilot_documents(query_embedding, match_count, filter)` SQL function for similarity search.
- Ingestion edge function `copilot-ingest` (admin-only) that chunks and embeds:
  - All public marketing pages (Home, ElsaPlus, Expert Services, Managed Cloud Hosting, Get Started, Docker pages, Runtime Builder landing).
  - Live package catalog (`runtime-builder-catalog` proxy → packages, features, infra providers).
  - Provider/bundle data from Supabase (Valence Works, bundles, intro call info).
  - Curated FAQ snippets sourced from existing memory entries (pricing, terminology, engagement boundaries).
- Embeddings via Lovable AI Gateway (`google/text-embedding-004` or fallback). Re-ingest nightly via cron + manual button in the existing admin dashboard.

## Tools (server-side, AI SDK `tool({...})`)

**Public (no auth):**
- `searchKnowledge({query, topK})` — pgvector retrieval, returns chunks + source URLs.
- `navigate({path, reason})` — returns a navigation directive the client follows after user click; never auto-navigates.
- `listBundles({providerSlug?})` / `getBundle({slug})` — public bundle catalog.
- `listPackages({query?, category?})` / `getPackage({id})` — proxied through `runtime-builder-catalog`.
- `bookIntroCall()` — returns the TidyCal URL.

**Authenticated read:**
- `getMyOrganizations()`, `getCreditBalance({orgId})`, `listOrders({orgId})`, `listSubscriptions({orgId})`, `listWorkHistory({orgId})`, `listMessageThreads({orgId})`, `getNotifications()`.

**Authenticated write (`needsApproval: true`):**
- `startBundlePurchase({orgId, bundleSlug})` → returns Stripe checkout URL (existing flow).
- `sendProviderMessage({threadId, body})`.
- `inviteTeamMember({orgId, email, role})`.
- `cancelInvite({inviteId})` / `resendInvite({inviteId})`.
- `bookIntroCall()` (auth variant prefills).

**Runtime Builder (write, `needsApproval: true`):**
- `rb.addPackage({packageId})`, `rb.removePackage({packageId})`.
- `rb.toggleFeature({packageId, featureId, enabled})`.
- `rb.setFeatureSetting({packageId, featureId, key, value})`.
- `rb.selectInfrastructure({kind, providerId})`, `rb.autoFillInfrastructure()`.
- `rb.validate()` → runs `resolveBuild` and returns findings.
- `rb.generateBundle()` → triggers existing `generate.ts` and surfaces the download.
- `rb.applyPreset({name})` (e.g. "Identity + Postgres + Redis").

These are exposed to the model only when the panel is open inside `/runtime-builder/*`. The client owns the Zustand store; the edge function returns intent payloads and the client applies them after the user confirms in the inline approval card.

## Architecture diagram

```text
 Browser
 ├── CopilotLauncher (global)
 └── CopilotPanel (Sheet)
      ├── useChat({ id: threadId, transport: '/functions/v1/copilot-chat' })
      ├── route-aware system context (path, orgId, builder snapshot)
      └── Tool dispatcher (navigate, rb.*, confirmations)
                       │
                       ▼
 Supabase Edge Functions
 ├── copilot-chat       → streamText (Lovable AI) + tools + RAG
 ├── copilot-ingest     → chunk + embed → copilot_documents
 └── runtime-builder-catalog (existing proxy, reused)
                       │
                       ▼
 Postgres
 ├── copilot_threads / copilot_messages   (RLS: user-scoped)
 └── copilot_documents (pgvector)         (read-only via RPC)
```

## Step-by-step build

1. **DB migration**: `copilot_threads`, `copilot_messages`, `copilot_documents` (+ pgvector extension, HNSW index, `match_copilot_documents` RPC), RLS policies.
2. **Edge function `copilot-chat`**: AI SDK + Lovable AI Gateway, dynamic tool set based on caller auth + route context sent in the request body, `stopWhen: stepCountIs(50)`, persist messages in `onFinish`.
3. **Edge function `copilot-ingest`**: admin-only; embed marketing pages, package catalog, bundles, FAQ; upsert into `copilot_documents`.
4. **Install AI Elements** primitives.
5. **Client surfaces**:
   - `src/components/copilot/CopilotProvider.tsx` (route + builder-snapshot context).
   - `src/components/copilot/CopilotLauncher.tsx`.
   - `src/components/copilot/CopilotPanel.tsx` (Sheet + AI Elements).
   - `src/components/copilot/ToolRenderers/*` (BundleCard, CreditBalance, BuilderDiff, NavigateLink, ConfirmCard).
   - `src/pages/copilot/CopilotThread.tsx` at `/copilot/:threadId`.
   - `src/lib/copilot/store.ts` (active thread, panel open state) + `useCopilotTools.ts` (client-side handlers for `navigate` and `rb.*`).
6. **Wire Runtime Builder**: expose Zustand store snapshot + apply-intent helpers to the Copilot context provider.
7. **Admin**: small "Re-index Copilot knowledge" button in the existing admin dashboard.
8. **Mount** `<CopilotProvider>` at app root, render launcher except on `/auth`, `/lovable/*`, and embedded checkout.
9. **Verify**: anonymous Q&A → answers with citations; signed-in → credit balance tool; Runtime Builder → "Add OpenIddict" produces a confirm card that toggles the right feature; thread reload restores messages.

## Out of scope (v1)

- Voice / speech.
- Multi-user collaboration in a thread.
- Provider-side admin actions inside the Copilot.
- Auto-execution of write tools without explicit confirmation.
- File upload to chat (can be added later via AI Elements attachments).

## Open questions before build

- Re-index cadence: nightly cron OK, or manual-only for v1?
- Should anonymous users be allowed to read public bundle/package data through tools, or only RAG snippets?
- Default model: stick with `google/gemini-3-flash-preview`, or use `google/gemini-3.1-pro-preview` for Runtime Builder threads where reasoning matters more?
