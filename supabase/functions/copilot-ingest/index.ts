// Admin-only ingestion job for the Copilot knowledge base.
// Embeds:
//  - Service providers and their active credit bundles (from Postgres)
//  - Packages + features + infrastructure providers (from runtime-builder-catalog API)
//  - Curated FAQ + page snippets (hard-coded below — short, source-of-truth copy)
// Writes embeddings into copilot_documents using the service role.

import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { embedTexts } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const CATALOG_BASE = Deno.env.get("ELSA_PACKAGE_CATALOG_API_BASE_URL") ??
  "https://api-k35qdj734hds2.azurewebsites.net";
const CATALOG_KEY = Deno.env.get("ELSA_PACKAGE_CATALOG_API_KEY")!;

const SITE_BASE = "https://elsa-workflows.io";

type Doc = {
  source: "page" | "package" | "bundle" | "faq" | "provider" | "infrastructure";
  external_id: string;
  url: string | null;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
};

const PAGE_DOCS: Doc[] = [
  {
    source: "page",
    external_id: "page:home",
    url: `${SITE_BASE}/`,
    title: "Elsa Workflows — Home",
    body: "Elsa Workflows is an open-source .NET workflow engine for building durable, long-running, and event-driven business processes. The Elsa+ ecosystem layers commercial offerings on top: production Docker images, expert services, managed cloud hosting, training, and the Runtime Builder.",
  },
  {
    source: "page",
    external_id: "page:elsa-plus",
    url: `${SITE_BASE}/elsa-plus`,
    title: "Elsa+ Ecosystem",
    body: "Elsa+ is the commercial ecosystem around Elsa Workflows. It includes Expert Services (prepaid credit-based engagements), Production Docker Images, the Runtime Builder (assemble a deployable Elsa runtime from packages and infrastructure), Managed Cloud Hosting, and Training. Elsa+ is conceptually separate from the neutral open-source engine.",
  },
  {
    source: "page",
    external_id: "page:expert-services",
    url: `${SITE_BASE}/elsa-plus/expert-services`,
    title: "Expert Services — prepaid credit bundles",
    body: "Expert Services are delivered by certified providers (currently Valence Works) using a prepaid credit model. You purchase a bundle of hours; work is logged in 15-minute increments; credits are consumed FIFO. Bundles include Implementation, Advisory (retained monthly), and Priority Support. Free 30-minute introductory calls are available via TidyCal.",
  },
  {
    source: "page",
    external_id: "page:runtime-builder",
    url: `${SITE_BASE}/elsa-plus/runtime-builder`,
    title: "Runtime Builder",
    body: "The Runtime Builder is a public-preview tool that assembles a deployable Elsa runtime from package manifests and required infrastructure (databases, message brokers, caches, blob storage, SMTP). The wizard has 7 steps: Sources, Packages, Features, Infrastructure, Configure, Validate, Bundle. The output is a docker-compose.yml plus an .env.example. Capabilities are derived from the selected package features, not from images.",
  },
  {
    source: "page",
    external_id: "page:docker-images",
    url: `${SITE_BASE}/elsa-plus/docker-images`,
    title: "Production Docker Images",
    body: "Curated, hardened Docker images for running Elsa Server and Elsa Studio in production. Includes Elsa Pro Studio (Blazor Server) and related images.",
  },
  {
    source: "page",
    external_id: "page:cloud-services",
    url: `${SITE_BASE}/elsa-plus/cloud-services`,
    title: "Managed Cloud Hosting",
    body: "Operationally-focused managed hosting for Elsa runtimes. Operations team handles deployment, scaling, monitoring, and updates so you can focus on workflow logic.",
  },
  {
    source: "page",
    external_id: "page:training",
    url: `${SITE_BASE}/elsa-plus/training`,
    title: "Elsa+ Training",
    body: "Live and self-paced training on Elsa Workflows architecture, activities, persistence, distributed runtime, and integration patterns.",
  },
  {
    source: "page",
    external_id: "page:get-started-docker",
    url: `${SITE_BASE}/get-started/docker`,
    title: "Get Started with Docker",
    body: "Quickest way to try Elsa Workflows: pull the official OSS Docker images and run Elsa Server + Elsa Studio locally with docker compose. The recommended version anchor is Elsa 3.6.1.",
  },
];

const FAQ_DOCS: Doc[] = [
  {
    source: "faq",
    external_id: "faq:credits-terminology",
    url: `${SITE_BASE}/elsa-plus/expert-services`,
    title: "Credits — terminology",
    body: "Use 'Credits purchased' and 'Credits consumed'. We never use the word 'burn'. Credits represent prepaid expert hours and are tracked in minutes (1 hour = 60 minutes).",
  },
  {
    source: "faq",
    external_id: "faq:credits-fifo",
    url: `${SITE_BASE}/elsa-plus/expert-services`,
    title: "How credit consumption works",
    body: "Credit lots are allocated FIFO: when work is logged, the oldest active lot with remaining minutes is consumed first. Lots have an expiry; expired lots are excluded from the active balance.",
  },
  {
    source: "faq",
    external_id: "faq:advisory-subscription",
    url: `${SITE_BASE}/elsa-plus/expert-services`,
    title: "Advisory subscription",
    body: "The Advisory subscription is a recurring monthly bundle of retained credits with a soft monthly consumption baseline. Unused credits roll within the policy window; consumption above the baseline still draws from purchased credits.",
  },
  {
    source: "faq",
    external_id: "faq:priority-support",
    url: `${SITE_BASE}/elsa-plus/expert-services`,
    title: "Priority Support policy",
    body: "Priority Support consumes credits at a 2x rate for after-hours or critical issues. Standard SLA applies; some categories of work are out of scope.",
  },
  {
    source: "faq",
    external_id: "faq:intro-call",
    url: `${SITE_BASE}/elsa-plus/expert-services/valence-works?intro=1`,
    title: "Free intro call",
    body: "We offer a free 30-minute introductory call via TidyCal to scope work and confirm fit before any purchase.",
  },
  {
    source: "faq",
    external_id: "faq:runtime-builder-preview",
    url: `${SITE_BASE}/elsa-plus/runtime-builder`,
    title: "Runtime Builder — public preview",
    body: "The Runtime Builder is in public preview. The output bundle is a starting point, not a turnkey production deployment. Validation findings from the catalog API must be resolved before generation.",
  },
];

async function fetchCatalog() {
  const res = await fetch(`${CATALOG_BASE}/api/builder/catalog`, {
    headers: { "x-api-key": CATALOG_KEY },
  });
  if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);
  return await res.json() as {
    packages?: Array<any>;
    infrastructureProviders?: Array<any>;
  };
}

async function buildBundleAndProviderDocs(
  supabase: ReturnType<typeof createClient>,
): Promise<Doc[]> {
  const docs: Doc[] = [];
  const { data: providers } = await supabase
    .from("service_providers")
    .select("id, slug, name, contact_email, availability_status, accepting_new_purchases, estimated_lead_time_days");
  for (const p of providers ?? []) {
    docs.push({
      source: "provider",
      external_id: `provider:${p.id}`,
      url: `${SITE_BASE}/elsa-plus/expert-services/${p.slug}`,
      title: `Provider: ${p.name}`,
      body:
        `Service provider "${p.name}". Slug: ${p.slug}. Availability: ${p.availability_status ?? "unknown"}. Accepting new purchases: ${p.accepting_new_purchases}. Lead time (days): ${p.estimated_lead_time_days ?? "unspecified"}.`,
      metadata: { providerId: p.id, slug: p.slug },
    });
  }

  const { data: bundles } = await supabase
    .from("credit_bundles")
    .select(
      "id, name, description, hours, price_cents, currency, billing_type, recurring_interval, monthly_hours, priority_level, service_provider_id, is_active",
    )
    .eq("is_active", true);
  const providerById = new Map((providers ?? []).map((p: any) => [p.id, p]));
  for (const b of bundles ?? []) {
    const provider = providerById.get(b.service_provider_id);
    const price = (b.price_cents / 100).toFixed(2);
    const billing = b.billing_type === "subscription"
      ? `recurring (${b.recurring_interval ?? "month"}, ${b.monthly_hours ?? b.hours} hours / period)`
      : `one-time (${b.hours} hours)`;
    docs.push({
      source: "bundle",
      external_id: `bundle:${b.id}`,
      url: provider
        ? `${SITE_BASE}/elsa-plus/expert-services/${provider.slug}`
        : null,
      title: `Bundle: ${b.name}`,
      body:
        `${b.name} — ${b.description ?? "No description."} Pricing: ${price} ${b.currency.toUpperCase()} ${billing}. Priority level: ${b.priority_level ?? "standard"}. Provider: ${provider?.name ?? "Unknown"}.`,
      metadata: { bundleId: b.id, providerId: b.service_provider_id },
    });
  }
  return docs;
}

function buildPackageDocs(catalog: { packages?: any[] }): Doc[] {
  const docs: Doc[] = [];
  for (const pkg of catalog.packages ?? []) {
    const features = (pkg.features ?? [])
      .map((f: any) => `- ${f.id}: ${f.displayName ?? f.name ?? f.id}${f.description ? ` — ${f.description}` : ""}`)
      .join("\n");
    docs.push({
      source: "package",
      external_id: `package:${pkg.id}`,
      url: `${SITE_BASE}/elsa-plus/runtime-builder`,
      title: `Package: ${pkg.displayName ?? pkg.id}`,
      body:
        `${pkg.displayName ?? pkg.id} (id: ${pkg.id}). ${pkg.description ?? ""}\n\nFeatures:\n${features || "(no features declared)"}`,
      metadata: { packageId: pkg.id, kind: "package" },
    });
  }
  return docs;
}

function buildInfraDocs(catalog: { infrastructureProviders?: any[] }): Doc[] {
  return (catalog.infrastructureProviders ?? []).map((ip: any) => ({
    source: "infrastructure" as const,
    external_id: `infra:${ip.id}`,
    url: `${SITE_BASE}/elsa-plus/runtime-builder`,
    title: `Infrastructure: ${ip.displayName ?? ip.id}`,
    body:
      `${ip.displayName ?? ip.id} (kind: ${ip.kind}, strategy: ${ip.strategy}, provider: ${ip.provider ?? "—"}). Capabilities: ${(ip.capabilities ?? []).join(", ") || "—"}.`,
    metadata: { kind: ip.kind, strategy: ip.strategy },
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  // Auth: cron secret OR platform admin
  const CRON_SECRET = Deno.env.get("COPILOT_INGEST_CRON_SECRET");
  const providedCronSecret = req.headers.get("x-cron-secret");
  let actor: "cron" | "admin" = "admin";

  if (providedCronSecret) {
    if (!CRON_SECRET) {
      return new Response(
        JSON.stringify({ error: "Cron secret not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    // constant-time compare
    const a = new TextEncoder().encode(providedCronSecret);
    const b = new TextEncoder().encode(CRON_SECRET);
    let ok = a.length === b.length;
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) ok = ok && (a[i] === b[i]);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    actor = "cron";
  } else {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAsUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userRes } = await supabaseAsUser.auth.getUser();
    const userId = userRes.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseServiceCheck = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: adminRow } = await supabaseServiceCheck
      .from("platform_admins")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!adminRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Build documents
  const [catalog, dbDocs] = await Promise.all([
    fetchCatalog().catch((e) => {
      console.error("catalog fetch failed", e);
      return { packages: [], infrastructureProviders: [] };
    }),
    buildBundleAndProviderDocs(supabaseService),
  ]);
  const docs: Doc[] = [
    ...PAGE_DOCS,
    ...FAQ_DOCS,
    ...dbDocs,
    ...buildPackageDocs(catalog),
    ...buildInfraDocs(catalog),
  ];

  // Embed in batches of 32
  const batchSize = 32;
  let upserted = 0;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    const inputs = batch.map((d) => `${d.title}\n\n${d.body}`);
    const embeddings = await embedTexts(LOVABLE_API_KEY, inputs);
    const rows = batch.map((d, idx) => ({
      source: d.source,
      external_id: d.external_id,
      url: d.url,
      title: d.title,
      body: d.body,
      metadata: d.metadata ?? {},
      embedding: embeddings[idx] as unknown as string, // pgvector accepts numeric arrays
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabaseService
      .from("copilot_documents")
      .upsert(rows, { onConflict: "source,external_id" });
    if (error) {
      console.error("upsert error", error);
      return new Response(
        JSON.stringify({ error: error.message, upserted }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    upserted += rows.length;
  }

  return new Response(
    JSON.stringify({ ok: true, upserted, total: docs.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
