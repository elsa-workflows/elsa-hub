import { createClient } from "npm:@supabase/supabase-js@2.93.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const MAX_INPUT_CHARS = 40_000;

// Transcripts (.vtt/.srt) are mostly timestamps and cue numbers. Strip them so the
// model receives dialogue only — this cuts token count (and latency) by a large factor.
function cleanTranscript(name: string, raw: string) {
  if (!/\.(vtt|srt)$/i.test(name)) return raw;
  const lines = raw.split(/\r?\n/);
  const out: string[] = [];
  let last = "";
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t === "WEBVTT" || /^\d+$/.test(t)) continue;
    if (t.includes("-->")) continue;
    if (/^(NOTE|STYLE|REGION)\b/.test(t)) continue;
    const text = t.replace(/<[^>]+>/g, "").trim();
    if (!text || text === last) continue;
    last = text;
    out.push(text);
  }
  return out.join("\n");
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI gateway not configured" }, 500);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    if (!sessionId) return json({ error: "sessionId is required" }, 400);

    // RLS enforces access
    const { data: session, error: sErr } = await userClient
      .from("workspace_sessions")
      .select("id, workspace_id, title, session_type, occurred_at, duration_minutes, participants, notes_markdown")
      .eq("id", sessionId)
      .maybeSingle();
    if (sErr || !session) return json({ error: "Session not found or no access" }, 404);

    // Pull attached text-readable files
    const { data: files } = await userClient
      .from("workspace_files")
      .select("id, file_name, mime_type, storage_path")
      .eq("session_id", sessionId);

    const textParts: string[] = [];
    if (session.notes_markdown?.trim()) {
      textParts.push(`# Notes\n${session.notes_markdown.trim()}`);
    }

    for (const f of files || []) {
      const isText =
        (f.mime_type || "").startsWith("text/") ||
        /\.(vtt|srt|txt|md)$/i.test(f.file_name);
      if (!isText) continue;
      const { data: blob, error: dlErr } = await serviceClient.storage
        .from("engagement-files")
        .download(f.storage_path);
      if (dlErr || !blob) {
        console.error("download failed", f.file_name, dlErr?.message);
        continue;
      }
      try {
        const t = cleanTranscript(f.file_name, await blob.text());
        if (t.trim()) textParts.push(`# ${f.file_name}\n${t.trim()}`);
      } catch (e) {
        console.error("read failed", f.file_name, (e as Error).message);
      }

    }

    if (textParts.length === 0) {
      return json(
        { error: "Add notes or attach a transcript (.txt, .vtt, .srt, .md) before summarizing." },
        400,
      );
    }

    let combined = textParts.join("\n\n---\n\n");
    if (combined.length > MAX_INPUT_CHARS) {
      combined = combined.slice(0, MAX_INPUT_CHARS) + "\n…[truncated]";
    }

    const systemPrompt = `You are a senior consultant reviewing a client session (call, workshop, or async review).
Produce a tight, factual summary, the key points, and concrete action items.
Owner hints should be names or roles mentioned in the source. Due hints should be relative phrases ("next week") or explicit dates.`;

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
              content: `Session: ${session.title} (${session.session_type})\nWhen: ${session.occurred_at}\nParticipants: ${(session.participants as any[] | null)?.join(", ") || "n/a"}\n\n---\n${combined}`,
            },
          ],
          response_format: { type: "json_object" },
        }),
      },
    );

    if (aiResponse.status === 429) return json({ error: "Rate limited. Try again shortly." }, 429);
    if (aiResponse.status === 402) {
      return json({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }, 402);
    }
    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      return json({ error: `AI gateway error: ${errText}` }, 502);
    }

    const completion = await aiResponse.json();
    const contentText = completion?.choices?.[0]?.message?.content;
    let parsed: any;
    try {
      parsed = JSON.parse(contentText || "");
    } catch {
      console.error("unparsable AI output", String(contentText).slice(0, 500));
      return json({ error: "AI did not return a structured summary" }, 502);
    }
    if (!parsed?.summary) {
      return json({ error: "AI did not return a structured summary" }, 502);
    }


    // Persist on the session row
    const { error: updateErr } = await serviceClient
      .from("workspace_sessions")
      .update({
        ai_summary: parsed.summary,
        ai_key_points: parsed.key_points || [],
        ai_action_items: parsed.action_items || [],
        ai_generated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (updateErr) return json({ error: `Could not save summary: ${updateErr.message}` }, 500);

    return json(parsed, 200);
  } catch (err) {
    console.error("summarize-session error", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
