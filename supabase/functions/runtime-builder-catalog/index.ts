// Proxy for the Valence Control builder API.
// Keeps the X-Api-Key strictly server-side. Browser must call this function via
// supabase.functions.invoke() — never call the upstream URL directly.
//
// Actions:
//   catalog   GET  /api/builder/catalog                  (anonymous upstream)
//   providers GET  /api/builder/infrastructure/providers (anonymous upstream)
//   resolve   POST /api/builder/resolve                  (anonymous upstream)
//   plan      POST /api/builder/plan                     (anonymous upstream)
//   bundle    POST /api/builder/bundle                   (requires X-Api-Key)
//   health    GET  /health

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

const DEFAULT_BASE_URL = "https://api-m5uymkuaf222o.azurewebsites.net";
const TIMEOUT_MS = 60_000;

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

function base64FromBytes(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

const UNAVAILABLE_FINDING = {
  level: "warning",
  code: "upstream_unavailable",
  message:
    "The compatibility checker is temporarily unavailable. Your selection has not been validated against the upstream resolver.",
  scope: { kind: "global" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("ELSA_PACKAGE_CATALOG_API_KEY") ?? "";
  const baseUrl = (Deno.env.get("ELSA_PACKAGE_CATALOG_API_BASE_URL") ?? DEFAULT_BASE_URL).replace(
    /\/+$/,
    "",
  );

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
      try {
        const { status, body } = await proxyJson(`${baseUrl}/api/builder/catalog`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (status >= 200 && status < 300) {
          catalogCache = { key: cacheKey, expiresAt: now + CATALOG_TTL_MS, payload: body };
          return jsonResponse(status, body);
        }
        if (catalogCache && catalogCache.key === cacheKey) {
          console.error("catalog upstream error, serving stale cache", status);
          return jsonResponse(200, catalogCache.payload);
        }
        console.error("catalog upstream error", status, JSON.stringify(body).slice(0, 500));
        return jsonResponse(200, {
          images: [],
          packages: [],
          infrastructureProviders: [],
          _degraded: true,
          _error: "Catalog service temporarily unavailable.",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        if (catalogCache && catalogCache.key === cacheKey) {
          console.error("catalog fetch failed, serving stale cache:", message);
          return jsonResponse(200, catalogCache.payload);
        }
        console.error("catalog fetch failed:", message);
        return jsonResponse(200, {
          images: [],
          packages: [],
          infrastructureProviders: [],
          _degraded: true,
          _error: "Catalog service temporarily unavailable.",
        });
      }
    }

    if (action === "providers") {
      const { status, body } = await proxyJson(
        `${baseUrl}/api/builder/infrastructure/providers`,
        { method: "GET", headers: { Accept: "application/json" } },
      );
      return jsonResponse(status >= 500 ? 200 : status, body);
    }

    if (action === "resolve" || action === "plan") {
      try {
        const { status, body } = await proxyJson(`${baseUrl}/api/builder/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload.body ?? {}),
        });
        if (status >= 500) {
          console.error(`${action} upstream error`, status, JSON.stringify(body).slice(0, 500));
          return jsonResponse(200, { compatible: true, findings: [UNAVAILABLE_FINDING] });
        }
        return jsonResponse(status, body);
      } catch (err) {
        console.error(`${action} fetch failed:`, err instanceof Error ? err.message : err);
        return jsonResponse(200, { compatible: true, findings: [UNAVAILABLE_FINDING] });
      }
    }

    if (action === "bundle") {
      if (!apiKey) {
        return jsonResponse(500, { error: "ELSA_PACKAGE_CATALOG_API_KEY is not configured." });
      }
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(`${baseUrl}/api/builder/bundle`, {
          method: "POST",
          headers: {
            "X-Api-Key": apiKey,
            "Content-Type": "application/json",
            Accept: "application/json, application/zip, application/octet-stream",
          },
          body: JSON.stringify(payload.body ?? {}),
          signal: ctrl.signal,
        });
        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const text = await res.text();
          let body: unknown = null;
          try {
            body = text ? JSON.parse(text) : null;
          } catch {
            body = { error: "Upstream returned malformed JSON.", raw: text.slice(0, 500) };
          }
          if (!res.ok) {
            console.error("bundle upstream error", res.status, JSON.stringify(body).slice(0, 500));
            return jsonResponse(res.status, {
              error: `Bundle generation failed (HTTP ${res.status}).`,
              details: body,
            });
          }
          return jsonResponse(200, body);
        }

        const bytes = new Uint8Array(await res.arrayBuffer());
        if (!res.ok) {
          const text = new TextDecoder().decode(bytes).slice(0, 500);
          console.error("bundle upstream error", res.status, text);
          return jsonResponse(res.status, {
            error: `Bundle generation failed (HTTP ${res.status}).`,
            details: text,
          });
        }
        const disposition = res.headers.get("content-disposition") ?? "";
        const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
        return jsonResponse(200, {
          binary: {
            contentType: contentType || "application/octet-stream",
            fileName: match?.[1] ?? "deployment.zip",
            base64: base64FromBytes(bytes),
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("bundle fetch failed:", message);
        return jsonResponse(502, { error: `Bundle generation failed: ${message}` });
      } finally {
        clearTimeout(timeout);
      }
    }

    if (action === "health") {
      const { status, body } = await proxyJson(`${baseUrl}/health`, { method: "GET" });
      return jsonResponse(status, body);
    }

    return jsonResponse(400, { error: `Unknown action: ${action}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("runtime-builder-catalog proxy error", message);
    return jsonResponse(200, {
      images: [],
      packages: [],
      infrastructureProviders: [],
      _degraded: true,
      _error: `Upstream call failed: ${message}`,
    });
  }
});
