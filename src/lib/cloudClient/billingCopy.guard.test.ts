import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..");

// Cloud billing and link copy, on the sign-up, link, checkout and portal path.
const BILLING_COPY_FILES = [
  "src/lib/cloudClient/copy.ts",
  "src/components/cloud/CloudBillingPanel.tsx",
  "src/components/cloud/CloudLinkOrganizationState.tsx",
  "supabase/functions/_shared/cloud-billing.ts",
  "supabase/functions/_shared/stripe-customer.ts",
  "supabase/functions/customer-portal/cloud.ts",
  "supabase/functions/cloud-billing/index.ts",
  "supabase/functions/create-checkout-session/cloud.ts",
];

// The empty states Launch left as they are: they describe the current state, not a time.
const ALLOWED_EMPTY_STATES = [
  "No engines yet",
  "No activity yet",
  "No Elsa Cloud plan yet for this organization.",
];

const BANNED = /\b(later|temporarily|yet)\b/i;

describe("Cloud billing and link copy has no time hints (elsa-control#936)", () => {
  it.each(BILLING_COPY_FILES)("%s has no later/temporarily/yet", (file) => {
    let source = readFileSync(join(root, file), "utf8");
    for (const allowed of ALLOWED_EMPTY_STATES) source = source.split(allowed).join("");
    const strings = source
      .split("\n")
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .filter((line) => /["'`]/.test(line))
      .filter((line) => BANNED.test(line));
    expect(strings).toEqual([]);
  });
});
