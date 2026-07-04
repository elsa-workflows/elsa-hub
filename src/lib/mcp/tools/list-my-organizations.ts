import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_my_organizations",
  title: "List my organizations",
  description:
    "List the Elsa Workflows organizations the signed-in user belongs to, with role, slug, and id.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("organization_members")
      .select("role, organization:organizations(id, name, slug, contact_email, created_at)")
      .eq("user_id", ctx.getUserId());
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    const orgs = (data ?? []).map((row: any) => ({
      id: row.organization?.id,
      name: row.organization?.name,
      slug: row.organization?.slug,
      role: row.role,
      contactEmail: row.organization?.contact_email,
      createdAt: row.organization?.created_at,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(orgs, null, 2) }],
      structuredContent: { organizations: orgs },
    };
  },
});
