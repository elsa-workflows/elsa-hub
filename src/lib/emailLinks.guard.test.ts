import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const functions = join(here, "..", "..", "supabase", "functions");

// Edge Functions whose links or images reach customers by email or notification.
const CUSTOMER_LINK_FILES = [
  "_shared/emailTemplate.ts",
  "send-invitation/index.ts",
  "send-notification/index.ts",
  "create-notification/index.ts",
  "send-renewal-notices/index.ts",
  "send-work-digest/index.ts",
  "send-broadcast/index.ts",
  "create-resend-template/index.ts",
  "update-resend-template/index.ts",
  "recreate-resend-template/index.ts",
  "unsubscribe/index.ts",
];

describe("customer-facing links use the canonical Hub host", () => {
  it.each(CUSTOMER_LINK_FILES)("%s does not link to elsa-hub.lovable.app", (file) => {
    const source = readFileSync(join(functions, file), "utf8");
    expect(source).not.toContain("elsa-hub.lovable.app");
  });

  it("the invitation link is on www.elsaworkflows.io", () => {
    const source = readFileSync(join(functions, "send-invitation/index.ts"), "utf8");
    expect(source).toContain("https://www.elsaworkflows.io/invite/${token_value}");
  });
});
