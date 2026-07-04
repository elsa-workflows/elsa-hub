import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoAmI from "./tools/who-am-i";
import listMyOrganizations from "./tools/list-my-organizations";
import getOrganizationCredits from "./tools/get-organization-credits";

// Build the OAuth issuer from the project ref (import-safe: Vite inlines this
// at build time). Never derive it from SUPABASE_URL — on Lovable Cloud that's
// the .lovable.cloud proxy, which mcp-js will reject as an issuer mismatch.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "elsa-workflows-mcp",
  title: "Elsa Workflows",
  version: "0.1.0",
  instructions:
    "Tools for the Elsa Workflows platform. Use `who_am_i` to confirm the signed-in user, `list_my_organizations` to enumerate the user's organizations, and `get_organization_credits` to inspect Expert Services credit balances by organization slug.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoAmI, listMyOrganizations, getOrganizationCredits],
});
