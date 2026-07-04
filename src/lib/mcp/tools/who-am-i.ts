import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "who_am_i",
  title: "Who am I",
  description:
    "Return the signed-in Elsa Workflows user: user id, email, and display name from their profile.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
    const userId = ctx.getUserId();
    const { data, error } = await supabaseForUser(ctx)
      .from("user_profiles")
      .select("user_id, display_name, avatar_url")
      .eq("user_id", userId)
      .maybeSingle();
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    const payload = {
      userId,
      email: ctx.getUserEmail(),
      displayName: data?.display_name ?? null,
      avatarUrl: data?.avatar_url ?? null,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
