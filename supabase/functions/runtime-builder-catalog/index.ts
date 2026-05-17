// Proxy for the Elsa Package Catalog API.
// Keeps the X-Api-Key strictly server-side. Browser must call this function via
// supabase.functions.invoke() — never call the upstream URL directly.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    [
      "authorization",
      "x-client-info",
      "apikey",
      "content-type",
      "x-supabase-client-platform",
      "x-supabase-api-version",
    ].join(", "),
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const DEFAULT_BASE_URL = "https://api-k35qdj734hds2.azurewebsites.net";
const TIMEOUT_MS = 30_000;

// Tiny in-memory cache for the catalog response. Lives only for the function
// instance lifetime (good enough to absorb burst traffic from a single user
// loading the wizard).
let catalogCache: { key: string; expiresAt: number; payload: unknown } | null = null;
const CATALOG_TTL_MS = 60_000;

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function proxyJson(
  url: string,
  init: RequestInit,
): Promise<{ status: number; body: unknown }> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const text = await res.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { error: "Upstream returned non-JSON response.", raw: text.slice(0, 500) };
      }
    }
    return { status: res.status, body };
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("ELSA_PACKAGE_CATALOG_API_KEY");
  if (!apiKey) {
    return jsonResponse(500, {
      error: "ELSA_PACKAGE_CATALOG_API_KEY is not configured.",
    });
  }
  const baseUrl = (Deno.env.get("ELSA_PACKAGE_CATALOG_API_BASE_URL") ?? DEFAULT_BASE_URL).replace(/\/+$/, "");

  let payload: { action?: string; body?: unknown } = {};
  if (req.method === "POST") {
    try {
      payload = (await req.json()) as typeof payload;
    } catch {
      return jsonResponse(400, { error: "Body must be valid JSON." });
    }
  } else {
    const url = new URL(req.url);
    payload.action = url.searchParams.get("action") ?? "catalog";
  }

  const action = payload.action ?? "catalog";

  try {
    if (action === "catalog") {
      const cacheKey = baseUrl;
      const now = Date.now();
      if (catalogCache && catalogCache.key === cacheKey && catalogCache.expiresAt > now) {
        return jsonResponse(200, catalogCache.payload);
      }
      const { status, body } = await proxyJson(`${baseUrl}/api/builder/catalog`, {
        method: "GET",
        headers: { "X-Api-Key": apiKey, Accept: "application/json" },
      });
      if (status >= 200 && status < 300) {
        catalogCache = { key: cacheKey, expiresAt: now + CATALOG_TTL_MS, payload: body };
      }
      return jsonResponse(status, body);
    }

    if (action === "resolve") {
      const incoming = (payload.body ?? {}) as {
        packages?: Array<{ id?: string; packageId?: string; version?: string; features?: string[] }>;
        infrastructure?: unknown[];
      };
      // Upstream expects `packageId` (matching the /catalog shape). Map both
      // for compatibility.
      const upstreamBody = {
        packages: (incoming.packages ?? []).map((p) => ({
          packageId: p.packageId ?? p.id,
          id: p.id ?? p.packageId,
          version: p.version,
          features: p.features ?? [],
          selectedFeatures: p.features ?? [],
        })),
        infrastructure: incoming.infrastructure ?? [],
      };
      const { status, body: respBody } = await proxyJson(`${baseUrl}/api/builder/resolve`, {
        method: "POST",
        headers: {
          "X-Api-Key": apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(upstreamBody),
      });
      // Don't let upstream 5xx crash the wizard — degrade to a warning finding.
      if (status >= 500) {
        console.error("resolve upstream error", status, JSON.stringify(respBody).slice(0, 500));
        return jsonResponse(200, {
          compatible: true,
          findings: [
            {
              level: "warning",
              code: "upstream_unavailable",
              message:
                "The compatibility checker is temporarily unavailable. Your selection has not been validated against the upstream resolver.",
              scope: { kind: "global" },
            },
          ],
        });
      }
      return jsonResponse(status, respBody);
    }

    if (action === "health") {
      const { status, body } = await proxyJson(`${baseUrl}/health`, {
        method: "GET",
        headers: { "X-Api-Key": apiKey },
      });
      return jsonResponse(status, body);
    }

    return jsonResponse(400, { error: `Unknown action: ${action}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("runtime-builder-catalog proxy error", message);
    return jsonResponse(502, { error: `Upstream call failed: ${message}` });
  }
});
