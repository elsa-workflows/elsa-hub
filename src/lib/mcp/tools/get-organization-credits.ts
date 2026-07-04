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
  name: "get_organization_credits",
  title: "Get organization credit balance",
  description:
    "Summarize active credit lots for an organization the user belongs to. Provide the organization slug (e.g. 'acme'). Returns per-provider totals of purchased vs remaining minutes.",
  inputSchema: {
    organizationSlug: z
      .string()
      .trim()
      .min(1)
      .describe("The organization's URL slug."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ organizationSlug }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, slug")
      .eq("slug", organizationSlug)
      .maybeSingle();
    if (orgError)
      return { content: [{ type: "text", text: orgError.message }], isError: true };
    if (!org)
      return {
        content: [{ type: "text", text: `Organization "${organizationSlug}" not found or not accessible.` }],
        isError: true,
      };

    const { data: lots, error: lotsError } = await supabase
      .from("credit_lots")
      .select("service_provider_id, minutes_purchased, minutes_remaining, status, expires_at")
      .eq("organization_id", org.id);
    if (lotsError)
      return { content: [{ type: "text", text: lotsError.message }], isError: true };

    const byProvider = new Map<string, { minutesPurchased: number; minutesRemaining: number; lots: number }>();
    for (const lot of lots ?? []) {
      if (lot.status !== "active") continue;
      const key = lot.service_provider_id;
      const prev = byProvider.get(key) ?? { minutesPurchased: 0, minutesRemaining: 0, lots: 0 };
      prev.minutesPurchased += lot.minutes_purchased ?? 0;
      prev.minutesRemaining += lot.minutes_remaining ?? 0;
      prev.lots += 1;
      byProvider.set(key, prev);
    }
    const providers = Array.from(byProvider.entries()).map(([serviceProviderId, v]) => ({
      serviceProviderId,
      ...v,
      hoursRemaining: Math.round((v.minutesRemaining / 60) * 100) / 100,
    }));
    const payload = { organization: org, providers };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
