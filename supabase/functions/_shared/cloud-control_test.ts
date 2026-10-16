import { assertEquals, assertFalse } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createControlFetch } from "./cloud-control.ts";

Deno.test("createControlFetch maps outages and non-JSON to updating without the upstream body", async () => {
  const env = {
    get(key: string) {
      return key === "ELSA_CONTROL_API_BASE_URL" ? "https://control.example.test" : undefined;
    },
  };

  const network = createControlFetch(env, async () => {
    throw new Error("ECONNRESET secret-token");
  });
  assertEquals(
    await network({ method: "GET", path: "/api/cloud/compatibility" }, "hub-token"),
    { ok: false, kind: "updating" },
  );

  const serverError = createControlFetch(env, async () =>
    new Response(JSON.stringify({ title: "stack at Control.Foo", detail: "pwd=secret" }), {
      status: 500,
    }));
  assertEquals(
    await serverError({ method: "GET", path: "/api/me/workspaces" }, "hub-token"),
    { ok: false, kind: "updating" },
  );

  const html = createControlFetch(env, async () =>
    new Response("<html>gateway timeout</html>", { status: 200 }));
  assertEquals(
    await html({ method: "POST", path: "/api/cloud/bootstrap" }, "hub-token"),
    { ok: false, kind: "updating" },
  );

  const missingBase = createControlFetch({ get: () => undefined }, async () => {
    throw new Error("should not fetch");
  });
  assertEquals(
    await missingBase({ method: "GET", path: "/api/cloud/compatibility" }, "hub-token"),
    { ok: false, kind: "updating" },
  );
});

Deno.test("createControlFetch forwards the Hub session and never treats 200 JSON as an outage", async () => {
  let seenAuth = "";
  const env = {
    get(key: string) {
      return key === "ELSA_CONTROL_API_BASE_URL" ? "https://control.example.test/" : undefined;
    },
  };
  const fetchImpl: typeof fetch = async (input, init) => {
    seenAuth = new Headers(init?.headers).get("Authorization") ?? "";
    assertEquals(String(input), "https://control.example.test/api/cloud/compatibility");
    return new Response(JSON.stringify({ contractVersion: 1, capabilities: [] }), {
      status: 200,
    });
  };
  const result = await createControlFetch(env, fetchImpl)(
    { method: "GET", path: "/api/cloud/compatibility" },
    "hub-session",
  );
  assertEquals(seenAuth, "Bearer hub-session");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertFalse("error" in (result.body as object));
  }
});
