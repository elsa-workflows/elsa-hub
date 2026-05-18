// AI Weaver chat edge function.
// - Streams responses from Lovable AI Gateway via the AI SDK.
// - Exposes grounding (RAG) + safe read tools to anonymous users.
// - Adds dashboard/Runtime Builder tools when the caller is authenticated.
// - Persists thread/message history under the caller's user_id.

import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import {
  convertToModelMessages,
  streamText,
  stepCountIs,
  tool,
  type UIMessage,
} from "npm:ai@^5.0.0";
import { z } from "npm:zod@^3.23.8";
import { createLovableAiGatewayProvider, embedTexts } from "../_shared/ai-gateway.ts";
import { ask as deepwikiAsk, readPage as deepwikiReadPage, readStructure as deepwikiReadStructure, type Repo as DeepWikiRepo } from "./deepwiki-mcp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

type RouteContext = {
  pathname?: string;
  organizationId?: string | null;
  inRuntimeBuilder?: boolean;
};

type ChatRequestBody = {
  threadId: string;
  messages: UIMessage[];
  routeContext?: RouteContext;
};

const SYSTEM_PROMPT = `You are the Elsa Weaver, an in-product assistant for the Elsa Workflows site (elsa-workflows.io) and the Elsa+ commercial ecosystem.

Voice: confident, senior, calm. No buzzwords, no apologies for limits, no marketing fluff. Brief by default; longer only when the user asks for depth.

Strict rules:
- For any factual claim about Elsa, packages, bundles, providers, pricing, the Runtime Builder, or how features work, call the searchKnowledge tool first. Quote or summarize what you find and cite the source URL inline as [title](url).
- If searchKnowledge returns nothing relevant, say so plainly. Do not invent package names, bundle prices, capabilities, infrastructure providers, or feature flags.
- Use intentional terminology. Say "Credits consumed" / "Credits purchased", never "burn".
- Strict separation: "Elsa Workflows" is the neutral OSS engine; "Elsa+" is the commercial ecosystem. Never blur them.
- The user's current page is provided in routeContext. Tailor suggestions to it.
- For account data (orders, credits, organizations, work history) call the corresponding tool. Do not guess.
- For Runtime Builder changes (add package, toggle feature, pick infra, pick runtime image, validate, generate) call the matching rb_* tool (rb_addPackage, rb_removePackage, rb_toggleFeature, rb_selectInfrastructure, rb_selectImage, rb_autoFillInfrastructure, rb_validate, rb_generateBundle). The client renders an inline approval card and nothing is applied until the user clicks Confirm. Therefore, when you propose an rb_* action, describe it as a proposal awaiting confirmation. Use phrasing like "I can enable X — confirm below" or "Proposed: add package Y". Never say "I enabled", "I added", "done", or "applied" — the change has not happened yet. After the user confirms, the UI shows the result; do not preemptively claim success.
- For questions about Elsa source code, internal implementation, class behavior, activity internals, or contributor-level details, call deepwikiAsk to get a real answer from the DeepWiki AI index of elsa-core / elsa-studio / elsa-extensions. Quote the answer and include any citation URLs returned. Use deepwikiReadStructure + deepwikiReadPage when you need to browse specific pages.
- Do not invent code references, class names, or method signatures. If searchKnowledge returns nothing relevant and the question is code-level, use deepwikiAsk.
- Never expose internal IDs, tokens, or service role details.
- After every assistant response, append exactly one line containing an HTML comment with up to three short, specific follow-up questions the user is likely to ask next, in this exact shape: <!--followups: ["question one?","question two?","question three?"]--> . Use JSON-encoded strings, keep each under 70 characters, phrase them from the user's point of view (e.g. "How do I…", "Show me…"), and tailor them to the routeContext and what was just discussed. If no useful follow-ups exist, append <!--followups: []-->.`;

function buildAnonymousTools(supabaseAnon: ReturnType<typeof createClient>) {
  return {
    searchKnowledge: tool({
      description:
        "Semantic search over Elsa site content, package catalog, bundles, and FAQ. Always call this before answering factual questions.",
      inputSchema: z.object({
        query: z.string().min(2).describe("Natural-language search query"),
        topK: z.number().int().min(1).max(8).default(5),
        source: z
          .enum(["page", "package", "bundle", "faq"])
          .optional()
          .describe("Optional filter by source type"),
      }),
      execute: async ({ query, topK, source }) => {
        try {
          const [embedding] = await embedTexts(LOVABLE_API_KEY, [query]);
          const { data, error } = await supabaseAnon.rpc(
            "match_copilot_documents",
            {
              query_embedding: embedding,
              match_count: topK,
              source_filter: source ?? null,
            },
          );
          if (error) throw error;
          return {
            results: (data ?? []).map((d: any) => ({
              title: d.title,
              url: d.url,
              source: d.source,
              snippet: d.body.slice(0, 700),
              similarity: Number(d.similarity?.toFixed(3) ?? 0),
            })),
          };
        } catch (e) {
          return { error: (e as Error).message, results: [] };
        }
      },
    }),

    navigate: tool({
      description:
        "Suggest navigating the user to a specific path inside the Elsa site. Returns a navigation intent the UI will render as a clickable card; never navigates automatically.",
      inputSchema: z.object({
        path: z.string().startsWith("/").describe("Internal path, e.g. /elsa-plus/runtime-builder"),
        label: z.string().describe("Short button label"),
        reason: z.string().describe("One-line reason this is relevant"),
      }),
      execute: async (intent) => ({ kind: "navigate", ...intent }),
    }),

    listBundles: tool({
      description: "List active credit bundles offered on the platform.",
      inputSchema: z.object({
        providerSlug: z.string().optional(),
      }),
      execute: async ({ providerSlug }) => {
        let q = supabaseAnon
          .from("credit_bundles")
          .select(
            "id, name, description, hours, price_cents, currency, billing_type, recurring_interval, monthly_hours, priority_level, service_provider_id",
          )
          .eq("is_active", true);
        if (providerSlug) {
          const { data: provider } = await supabaseAnon
            .from("service_providers")
            .select("id")
            .eq("slug", providerSlug)
            .maybeSingle();
          if (provider?.id) q = q.eq("service_provider_id", provider.id);
        }
        const { data, error } = await q;
        if (error) return { error: error.message, bundles: [] };
        return { bundles: data ?? [] };
      },
    }),

    deepwikiAsk: tool({
      description:
        "Ask the DeepWiki MCP server a code-level question about Elsa. Returns an inline answer and citation URLs. Use for C# internals, activity implementations, persistence stores, runtime internals, or any 'how does X work under the hood' question. Prefer this over linking out.",
      inputSchema: z.object({
        question: z.string().min(2),
        repo: z
          .enum(["elsa-core", "elsa-studio", "elsa-extensions"])
          .default("elsa-core"),
      }),
      execute: async ({ question, repo }) => {
        try {
          return await deepwikiAsk(question, repo as DeepWikiRepo);
        } catch (e) {
          return {
            error: (e as Error).message,
            fallbackUrl: `https://deepwiki.com/elsa-workflows/${repo}`,
            repo,
          };
        }
      },
    }),

    deepwikiReadStructure: tool({
      description:
        "List the pages available in a DeepWiki repo. Use to discover specific pages before calling deepwikiReadPage.",
      inputSchema: z.object({
        repo: z
          .enum(["elsa-core", "elsa-studio", "elsa-extensions"])
          .default("elsa-core"),
      }),
      execute: async ({ repo }) => {
        try {
          return await deepwikiReadStructure(repo as DeepWikiRepo);
        } catch (e) {
          return { error: (e as Error).message, pages: [], repo };
        }
      },
    }),

    deepwikiReadPage: tool({
      description:
        "Fetch the contents of a specific DeepWiki page (markdown). Discover page names with deepwikiReadStructure first.",
      inputSchema: z.object({
        page: z.string().min(1),
        repo: z
          .enum(["elsa-core", "elsa-studio", "elsa-extensions"])
          .default("elsa-core"),
      }),
      execute: async ({ page, repo }) => {
        try {
          return await deepwikiReadPage(page, repo as DeepWikiRepo);
        } catch (e) {
          return { error: (e as Error).message, page, repo };
        }
      },
    }),

    bookIntroCall: tool({
      description: "Return the URL to book a free 30-minute introductory call.",
      inputSchema: z.object({}),
      execute: async () => ({
        kind: "navigate",
        path: "/elsa-plus/expert-services/valence-works?intro=1",
        label: "Book intro call",
        reason: "Free 30-minute introductory consultation.",
      }),
    }),
  };
}

function buildAuthedTools(
  supabaseAsUser: ReturnType<typeof createClient>,
  userId: string,
) {
  return {
    getMyOrganizations: tool({
      description: "List organizations the signed-in user belongs to.",
      inputSchema: z.object({}),
      execute: async () => {
        const { data, error } = await supabaseAsUser
          .from("organization_members")
          .select("role, organization_id, organizations(id, name, slug)")
          .eq("user_id", userId);
        if (error) return { error: error.message, organizations: [] };
        return {
          organizations: (data ?? []).map((m: any) => ({
            id: m.organizations?.id,
            name: m.organizations?.name,
            slug: m.organizations?.slug,
            role: m.role,
          })),
        };
      },
    }),

    getCreditBalance: tool({
      description:
        "Sum the user's organization's remaining minutes across active credit lots, with hours equivalent.",
      inputSchema: z.object({
        organizationId: z.string().uuid(),
      }),
      execute: async ({ organizationId }) => {
        const { data, error } = await supabaseAsUser
          .from("credit_lots")
          .select("minutes_remaining, expires_at, status, service_provider_id")
          .eq("organization_id", organizationId)
          .eq("status", "active");
        if (error) return { error: error.message };
        const minutes = (data ?? []).reduce(
          (s: number, r: any) => s + (r.minutes_remaining ?? 0),
          0,
        );
        return {
          organizationId,
          minutesRemaining: minutes,
          hoursRemaining: Math.round((minutes / 60) * 10) / 10,
          activeLots: data?.length ?? 0,
        };
      },
    }),

    listOrders: tool({
      description: "List recent orders for an organization the user belongs to.",
      inputSchema: z.object({
        organizationId: z.string().uuid(),
        limit: z.number().int().min(1).max(20).default(10),
      }),
      execute: async ({ organizationId, limit }) => {
        const { data, error } = await supabaseAsUser
          .from("orders")
          .select(
            "id, amount_cents, currency, status, created_at, paid_at, credit_bundle_id",
          )
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(limit);
        if (error) return { error: error.message, orders: [] };
        return { orders: data ?? [] };
      },
    }),

    listSubscriptions: tool({
      description: "List active or recent subscriptions for an organization.",
      inputSchema: z.object({ organizationId: z.string().uuid() }),
      execute: async ({ organizationId }) => {
        const { data, error } = await supabaseAsUser
          .from("subscriptions")
          .select(
            "id, status, current_period_start, current_period_end, cancel_at_period_end, credit_bundle_id",
          )
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false });
        if (error) return { error: error.message, subscriptions: [] };
        return { subscriptions: data ?? [] };
      },
    }),

    listWorkHistory: tool({
      description:
        "List recent work logs (consumed credits) for an organization.",
      inputSchema: z.object({
        organizationId: z.string().uuid(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
      execute: async ({ organizationId, limit }) => {
        const { data, error } = await supabaseAsUser
          .from("work_logs")
          .select(
            "id, performed_at, minutes_spent, category, description, is_billable",
          )
          .eq("organization_id", organizationId)
          .order("performed_at", { ascending: false })
          .limit(limit);
        if (error) return { error: error.message, workLogs: [] };
        return { workLogs: data ?? [] };
      },
    }),
  };
}

function buildRuntimeBuilderTools() {
  // These tools return intent payloads the client validates and applies after
  // the user clicks Confirm in the inline approval card. The edge function
  // never mutates builder state directly.
  return {
    rb_addPackage: tool({
      description: "Add a package to the current Runtime Builder configuration.",
      inputSchema: z.object({
        packageId: z.string().min(1),
        reason: z.string().optional(),
      }),
      execute: async (i) => ({ kind: "rb.addPackage", ...i }),
    }),
    rb_removePackage: tool({
      description: "Remove a package from the current configuration.",
      inputSchema: z.object({ packageId: z.string().min(1) }),
      execute: async (i) => ({ kind: "rb.removePackage", ...i }),
    }),
    rb_toggleFeature: tool({
      description: "Enable or disable a feature on a selected package.",
      inputSchema: z.object({
        packageId: z.string(),
        featureId: z.string(),
        enabled: z.boolean(),
      }),
      execute: async (i) => ({ kind: "rb.toggleFeature", ...i }),
    }),
    rb_selectInfrastructure: tool({
      description:
        "Select an infrastructure provider for a given infrastructure kind.",
      inputSchema: z.object({
        kind: z.string().describe("e.g. 'database', 'cache', 'message-broker'"),
        providerId: z.string(),
      }),
      execute: async (i) => ({ kind: "rb.selectInfrastructure", ...i }),
    }),
    rb_selectImage: tool({
      description:
        "Select the Docker image used at the top of the generated bundle. Slugs come from the curated image catalog: 'elsa-pro-server', 'elsa-pro-studio', 'elsa-pro-combined'. Optionally override the tag and host port. Picking Studio alone will auto-emit a Server companion service in the bundle.",
      inputSchema: z.object({
        slug: z.enum(["elsa-pro-server", "elsa-pro-studio", "elsa-pro-combined"]),
        tag: z.string().min(1).optional(),
        hostPort: z.number().int().min(1).max(65535).optional(),
        reason: z.string().optional(),
      }),
      execute: async (i) => ({ kind: "rb.selectImage", ...i }),
    }),
    rb_autoFillInfrastructure: tool({
      description:
        "Ask the builder to auto-pick infrastructure for any unmet requirement.",
      inputSchema: z.object({}),
      execute: async () => ({ kind: "rb.autoFillInfrastructure" }),
    }),
    rb_validate: tool({
      description: "Validate the current configuration via the catalog API.",
      inputSchema: z.object({}),
      execute: async () => ({ kind: "rb.validate" }),
    }),
    rb_generateBundle: tool({
      description: "Generate the deployable bundle (compose + env).",
      inputSchema: z.object({}),
      execute: async () => ({ kind: "rb.generateBundle" }),
    }),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!body.threadId || !Array.isArray(body.messages)) {
    return new Response(
      JSON.stringify({ error: "threadId and messages required" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Identify caller via the supplied JWT (if any).
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseAsUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let userId: string | null = null;
  if (authHeader) {
    const { data } = await supabaseAsUser.auth.getUser();
    userId = data.user?.id ?? null;
  }

  // ---- Rate limiting (per-IP for anonymous, per-user for authed) ----
  // Anonymous traffic is the higher-risk surface, so it gets the tighter cap.
  const RATE_LIMITS = userId
    ? { max: 30, windowSeconds: 300 } // 30 msgs / 5 min / signed-in user
    : { max: 8, windowSeconds: 300 }; // 8 msgs / 5 min / IP

  const ipHeader =
    req.headers.get("x-forwarded-for") ??
    req.headers.get("cf-connecting-ip") ??
    "unknown";
  const clientIp = ipHeader.split(",")[0].trim() || "unknown";
  const rateKey = userId ? `user:${userId}` : `ip:${clientIp}`;
  const windowStart = new Date(
    Date.now() - RATE_LIMITS.windowSeconds * 1000,
  ).toISOString();

  try {
    const { count, error: countErr } = await supabaseService
      .from("weaver_rate_events")
      .select("id", { count: "exact", head: true })
      .eq("key", rateKey)
      .gte("created_at", windowStart);
    if (countErr) throw countErr;
    if ((count ?? 0) >= RATE_LIMITS.max) {
      const retryAfter = RATE_LIMITS.windowSeconds;
      return new Response(
        JSON.stringify({
          error:
            `Rate limit reached. The Weaver allows ${RATE_LIMITS.max} messages every ${
              Math.round(RATE_LIMITS.windowSeconds / 60)
            } minutes${userId ? "" : " per visitor"}. Please wait a few minutes and try again.`,
          code: "rate_limited",
          retryAfterSeconds: retryAfter,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
          },
        },
      );
    }
    // Record this request and opportunistically prune very old rows.
    await supabaseService.from("weaver_rate_events").insert({ key: rateKey });
    if (Math.random() < 0.05) {
      const pruneBefore = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await supabaseService
        .from("weaver_rate_events")
        .delete()
        .lt("created_at", pruneBefore);
    }
  } catch (e) {
    // Never fail-close on rate-limit infra errors — log and proceed.
    console.error("rate-limit check failed", e);
  }

  // Build dynamic tool set
  const route = body.routeContext ?? {};
  const tools = {
    ...buildAnonymousTools(supabaseAnon),
    ...(userId ? buildAuthedTools(supabaseAsUser, userId) : {}),
    ...(route.inRuntimeBuilder ? buildRuntimeBuilderTools() : {}),
  };

  // Persist the latest user message (only for authenticated users with their thread)
  if (userId) {
    // Verify thread ownership / create on demand
    const { data: thread } = await supabaseAsUser
      .from("weaver_threads")
      .select("id, user_id")
      .eq("id", body.threadId)
      .maybeSingle();
    if (!thread) {
      await supabaseAsUser.from("weaver_threads").insert({
        id: body.threadId,
        user_id: userId,
        title: deriveTitle(body.messages),
        route_context: route as any,
      });
    } else if (thread.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lastUser = [...body.messages].reverse().find((m) => m.role === "user");
    if (lastUser) {
      // Avoid duplicate inserts on resume
      const { data: existing } = await supabaseAsUser
        .from("weaver_messages")
        .select("id")
        .eq("thread_id", body.threadId)
        .eq("ai_sdk_id", lastUser.id)
        .maybeSingle();
      if (!existing) {
        await supabaseAsUser.from("weaver_messages").insert({
          thread_id: body.threadId,
          role: "user",
          parts: lastUser.parts as any,
          ai_sdk_id: lastUser.id,
        });
      }
    }
  }

  const gateway = createLovableAiGatewayProvider(LOVABLE_API_KEY);
  const model = gateway("google/gemini-3-flash-preview");

  const systemWithRoute = `${SYSTEM_PROMPT}\n\nrouteContext: ${
    JSON.stringify(route)
  }\nauthenticated: ${Boolean(userId)}`;

  let result;
  try {
    result = streamText({
      model,
      system: systemWithRoute,
      tools,
      stopWhen: stepCountIs(userId ? 50 : 8),
      messages: convertToModelMessages(body.messages),
      abortSignal: req.signal,
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  return result.toUIMessageStreamResponse({
    originalMessages: body.messages,
    headers: corsHeaders,
    onFinish: async ({ messages, isAborted }) => {
      if (!userId) return;
      // Aborted runs are persisted by the client (server may be torn down
      // with the connection on edge runtimes). See client onFinish handler.
      if (isAborted) return;
      const last = messages[messages.length - 1];
      if (!last || last.role !== "assistant") return;
      if (!last.parts || last.parts.length === 0) return;
      try {
        await supabaseService.from("weaver_messages").insert({
          thread_id: body.threadId,
          role: "assistant",
          parts: last.parts as any,
          ai_sdk_id: last.id,
        });
        await supabaseService
          .from("weaver_threads")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", body.threadId);
      } catch (err) {
        console.error("weaver persist error", err);
      }
    },
  });
});

function deriveTitle(messages: UIMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New conversation";
  const text = firstUser.parts
    .map((p: any) => (p.type === "text" ? p.text : ""))
    .join(" ")
    .trim();
  return (text.slice(0, 60) || "New conversation").trim();
}
