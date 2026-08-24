import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Public, read-only endpoint that redirects to a blog author's current profile
// picture. Keeps blog bylines in sync with the author's profile avatar without
// exposing the profiles table or long-lived signed URLs.
//
// Allowlist maps a blog author slug (from the upstream blog repo) to the
// platform user whose profile picture should be served. Add entries here when
// new blog authors want their live profile picture on their posts.
const AUTHOR_USER_IDS: Record<string, string> = {
  sipke: "c33ba42e-5927-4989-beee-017b09caef35",
};

const AVATAR_BUCKET = "avatars";
const SIGNED_URL_TTL_SECONDS = 3600;

function notFound(): Response {
  return new Response("Not found", { status: 404, headers: corsHeaders });
}

function redirect(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      Location: location,
      // Short cache so avatar changes propagate within minutes.
      "Cache-Control": "public, max-age=300",
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const author = new URL(req.url).searchParams.get("author")?.trim().toLowerCase();
  const userId = author ? AUTHOR_USER_IDS[author] : undefined;
  if (!userId) return notFound();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !profile?.avatar_url) return notFound();

  // Derive the storage path from the stored signed URL and mint a fresh
  // short-lived URL, so the redirect never depends on a stale token.
  const match = profile.avatar_url.match(/\/object\/sign\/avatars\/([^?]+)/);
  if (match) {
    const path = decodeURIComponent(match[1]);
    const { data: signed } = await supabase.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (signed?.signedUrl) return redirect(signed.signedUrl);
  }

  // Fallback: the stored URL is itself a long-lived signed URL.
  return redirect(profile.avatar_url);
});
