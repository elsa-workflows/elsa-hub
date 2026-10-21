import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as contract from "./billingContract";

const server = readFileSync(
  path.resolve(__dirname, "../../../supabase/functions/_shared/cloud-billing.ts"),
  "utf8",
);

describe("Cloud billing contract", () => {
  it.each(Object.entries(contract))("%s matches the server's value", (name, value) => {
    expect(server).toContain(`export const ${name} = ${JSON.stringify(value)};`);
  });
});
