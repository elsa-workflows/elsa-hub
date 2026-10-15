const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NO_STORE = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
};

export function corsHeaders(): Record<string, string> {
  return { ...CORS_HEADERS };
}

export function preflightResponse(): Response {
  return new Response("ok", { headers: corsHeaders() });
}

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(),
      ...NO_STORE,
      "Content-Type": "application/json",
    },
  });
}

export function hasNoStore(response: Response): boolean {
  const cache = response.headers.get("Cache-Control") ?? "";
  return cache.split(",").some((part) => part.trim().toLowerCase() === "no-store");
}
