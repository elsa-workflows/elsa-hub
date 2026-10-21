import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as contract from "./billingContract";

const server = readFileSync(
  path.resolve(__dirname, "../../../supabase/functions/_shared/cloud-billing.ts"),
  "utf8",
);

/** The server's exported literal for name, parsed as JSON (strings and string arrays). */
function serverValue(name: string): unknown {
  const declaration = server.match(new RegExp(`export const ${name}(?::[^=]+)? = ([^;]+);`));
  return declaration ? JSON.parse(declaration[1]) : undefined;
}

describe("Cloud billing contract", () => {
  it.each(Object.entries(contract))("%s matches the server's value", (name, value) => {
    expect(serverValue(name)).toEqual(value);
  });
});
