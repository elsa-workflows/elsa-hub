import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const functions = join(here, "..", "..", "supabase", "functions");

// Edge Functions with verify_jwt = false that act on the Resend account. They
// must stay behind the admin guard (elsa-hub#189).
const ADMIN_ONLY_FILES = [
  "create-resend-template/index.ts",
  "update-resend-template/index.ts",
  "recreate-resend-template/index.ts",
];

describe("Resend template functions are admin-only", () => {
  it.each(ADMIN_ONLY_FILES)("%s checks guardAdminPost before doing any work", (file) => {
    const source = readFileSync(join(functions, file), "utf8");
    expect(source).toContain('from "../_shared/admin-auth.ts"');
    const guard = source.indexOf("await guardAdminPost(req, corsHeaders)");
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(source.indexOf("RESEND_API_KEY"));
    expect(guard).toBeLessThan(source.indexOf("api.resend.com"));
  });
});
