import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_INPUT_CHARS = 60_000;

interface SummaryResult {
  summary: string;
  key_points: string[];
  action_items: { title: string; owner_hint?: string; due_hint?: string }[];
  suggested_category: "development" | "consulting" | "training" | "support" | "other";
  suggested_minutes: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return json({ error: "AI gateway not configured" }, 500);
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY);

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const fileId = typeof body.fileId === "string" ? body.fileId : "";
    if (!fileId) return json({ error: "fileId is required" }, 400);

    // Fetch file metadata with the user's token so RLS protects us
    const { data: file, error: fileErr } = await userClient
      .from("workspace_files")
      .select("id, workspace_id, storage_path, file_name, mime_type, size_bytes")
      .eq("id", fileId)
      .maybeSingle();
    if (fileErr || !file) return json({ error: "File not found or no access" }, 404);

    // Download via service role (path-scoped to the workspace)
    const { data: blob, error: dlErr } = await serviceClient.storage
      .from("engagement-files")
      .download(file.storage_path);
    if (dlErr || !blob) return json({ error: "Could not read file" }, 500);

    let text = await blob.text();
    if (!text.trim()) return json({ error: "File is empty or not text-readable" }, 400);
    if (text.length > MAX_INPUT_CHARS) {
      text = text.slice(0, MAX_INPUT_CHARS) + "\n…[truncated]";
    }

    const systemPrompt = `You are a senior consultant reviewing a meeting transcript or work note.
Produce a tight, factual summary, the key points, the concrete action items, and an estimate of how long the meeting/work took.
Categories must be one of: development, consulting, training, support, other.
Minutes must be a positive integer. If unsure, estimate from transcript length (assume ~150 spoken words per minute).
Owner hints should be names or roles mentioned. Due hints should be relative phrases ("next week") or dates if explicit.`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `File: ${file.file_name}\n\n---\n${text}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "return_summary",
                description: "Return the structured summary of the transcript.",
                parameters: {
                  type: "object",
                  properties: {
                    summary: { type: "string", description: "2-4 sentence factual summary." },
                    key_points: {
                      type: "array",
                      items: { type: "string" },
                      description: "5-10 short bullet-style key points.",
                    },
                    action_items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          owner_hint: { type: "string" },
                          due_hint: { type: "string" },
                        },
                        required: ["title"],
                      },
                    },
                    suggested_category: {
                      type: "string",
                      enum: ["development", "consulting", "training", "support", "other"],
                    },
                    suggested_minutes: { type: "integer", minimum: 1, maximum: 600 },
                  },
                  required: [
                    "summary",
                    "key_points",
                    "action_items",
                    "suggested_category",
                    "suggested_minutes",
                  ],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "return_summary" } },
        }),
      },
    );

    if (aiResponse.status === 429) {
      return json({ error: "Rate limited. Try again in a minute." }, 429);
    }
    if (aiResponse.status === 402) {
      return json(
        { error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." },
        402,
      );
    }
    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      return json({ error: `AI gateway error: ${errText}` }, 502);
    }

    const aiJson = await aiResponse.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return json({ error: "AI did not return a structured summary" }, 502);
    }

    let parsed: SummaryResult;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      return json({ error: "Invalid AI response" }, 502);
    }

    return json(parsed, 200);
  } catch (err) {
    console.error("summarize-transcript error", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
