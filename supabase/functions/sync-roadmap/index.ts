import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ISSUE_URL = "https://api.github.com/repos/elsa-workflows/elsa-core/issues/3232";
const SOURCE_URL = "https://github.com/elsa-workflows/elsa-core/issues/3232";

const PARSE_SYSTEM = `You convert a GitHub roadmap issue (markdown) into structured JSON for a product roadmap page.

Return STRICT JSON matching:
{
  "themes": [
    {
      "title": string,
      "goal": string,           // one-sentence summary of the theme's purpose
      "icon": "shield" | "workflow" | "puzzle" | "eye" | "lock" | "sparkles" | "rocket" | "layers" | "gauge" | "wrench",
      "items": [
        { "title": string, "status": "shipped" | "in-progress" | "planned", "detail"?: string }
      ],
      "outcome": string          // one-sentence "why it matters"
    }
  ],
  "sequencing": [
    { "title": "Near term" | "Mid term" | "Longer term", "items": string[] }
  ]
}

Rules:
- Use only the content of the provided markdown. Do not invent items.
- Infer status from emoji/keywords: ✅/shipped/done -> "shipped"; 🚧/in progress/WIP/active -> "in-progress"; otherwise "planned".
- Pick the most semantically fitting icon per theme.
- If the issue clearly has no themes, return { "themes": [], "sequencing": [] }.
- Output ONLY the JSON object, no prose, no code fences.`;

async function fetchIssue() {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "elsa-workflows-roadmap-sync",
  };
  const token = Deno.env.get("GITHUB_TOKEN");
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(ISSUE_URL, { headers });
  if (!res.ok) throw new Error(`GitHub fetch failed ${res.status}: ${await res.text()}`);
  return await res.json();
}

async function parseWithAI(markdown: string): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return { ok: false, error: "LOVABLE_API_KEY not configured" };
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: PARSE_SYSTEM },
          { role: "user", content: markdown.slice(0, 60000) },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return { ok: false, error: `AI gateway ${res.status}: ${await res.text()}` };
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) return { ok: false, error: "Empty AI response" };
    const parsed = JSON.parse(content);
    if (!parsed || !Array.isArray(parsed.themes)) return { ok: false, error: "Schema mismatch: missing themes[]" };
    return { ok: true, data: parsed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const issue = await fetchIssue();
    const markdown: string = issue.body ?? "";
    const issueUpdatedAt: string | null = issue.updated_at ?? null;

    let parseStatus = "raw";
    let parsedJson: unknown = null;
    let parseError: string | null = null;

    if (markdown.trim().length > 0) {
      const ai = await parseWithAI(markdown);
      if (ai.ok && Array.isArray((ai.data as { themes?: unknown[] }).themes) && (ai.data as { themes: unknown[] }).themes.length > 0) {
        parseStatus = "structured";
        parsedJson = ai.data;
      } else if (!ai.ok) {
        parseError = ai.error;
      }
    }

    const { data, error } = await supabase
      .from("roadmap_snapshots")
      .insert({
        source_url: SOURCE_URL,
        issue_number: 3232,
        issue_updated_at: issueUpdatedAt,
        raw_markdown: markdown,
        parsed_json: parsedJson,
        parse_status: parseStatus,
        parse_error: parseError,
      })
      .select("id, synced_at, parse_status")
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, snapshot: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-roadmap error", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
