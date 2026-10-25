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

Deno.test("createControlFetch forwards mutation headers and maps instance_limit_reached", async () => {
  let seenKey = "";
  let seenMatch = "";
  const env = {
    get(key: string) {
      return key === "ELSA_CONTROL_API_BASE_URL" ? "https://control.example.test" : undefined;
    },
  };
  const fetchImpl: typeof fetch = async (_input, init) => {
    const headers = new Headers(init?.headers);
    seenKey = headers.get("Idempotency-Key") ?? "";
    seenMatch = headers.get("If-Match") ?? "";
    return new Response(JSON.stringify({
      code: "instance_limit_reached",
      currentInstances: 1,
      maxInstances: 1,
      detail: "provider-secret",
    }), { status: 422 });
  };
  const result = await createControlFetch(env, fetchImpl)({
    method: "POST",
    path: "/api/workspaces/1/instances",
    headers: { "Idempotency-Key": "abc", "If-Match": '"1"' },
    body: { name: "Prod" },
  }, "hub-session");
  assertEquals(seenKey, "abc");
  assertEquals(seenMatch, '"1"');
  assertEquals(result, {
    ok: false,
    kind: "limit",
    code: "instance_limit_reached",
    currentInstances: 1,
    maxInstances: 1,
  });
  assertFalse(JSON.stringify(result).includes("provider-secret"));
});

const BFF_CREDENTIAL = "bff-credential-0123456789abcdefghijklmnopqrstuv";

function bffEnv(credential: string | undefined) {
  return {
    get(key: string) {
      if (key === "ELSA_CONTROL_API_BASE_URL") return "https://control.example.test";
      if (key === "ELSA_CONTROL_BFF_CREDENTIAL") return credential;
      return undefined;
    },
  };
}

async function sentHeaders(
  credential: string | undefined,
  callHeaders?: Record<string, string>,
): Promise<Headers> {
  let seen = new Headers();
  const fetchImpl: typeof fetch = (_input, init) => {
    seen = new Headers(init?.headers);
    return Promise.resolve(
      new Response(JSON.stringify({ contractVersion: 1, capabilities: [] }), { status: 200 }),
    );
  };
  await createControlFetch(bffEnv(credential), fetchImpl)(
    { method: "POST", path: "/api/cloud/bootstrap", headers: callHeaders, body: {} },
    "hub-session",
  );
  return seen;
}

Deno.test("createControlFetch sends the BFF credential from the function secret", async () => {
  const headers = await sentHeaders(BFF_CREDENTIAL, { "Idempotency-Key": "abc" });
  assertEquals(headers.get("X-Elsa-Bff-Credential"), BFF_CREDENTIAL);
  assertEquals(headers.get("Idempotency-Key"), "abc");
  assertEquals(headers.get("Authorization"), "Bearer hub-session");
});

Deno.test("createControlFetch never lets a caller-supplied BFF credential through", async () => {
  for (const name of ["X-Elsa-Bff-Credential", "x-elsa-bff-credential", "X-ELSA-BFF-CREDENTIAL", "x-Elsa-bff-Credential"]) {
    const overridden = await sentHeaders(BFF_CREDENTIAL, { [name]: "client-value" });
    assertEquals(overridden.get("X-Elsa-Bff-Credential"), BFF_CREDENTIAL, name);

    const unset = await sentHeaders(undefined, { [name]: "client-value" });
    assertFalse(unset.has("X-Elsa-Bff-Credential"), name);
  }
});

Deno.test("createControlFetch sends no BFF credential when the function secret is unset or empty", async () => {
  for (const credential of [undefined, "", "   "]) {
    const headers = await sentHeaders(credential);
    assertFalse(headers.has("X-Elsa-Bff-Credential"), JSON.stringify(credential));
  }
});

Deno.test("createControlFetch never logs or returns the BFF credential", async () => {
  const captured: string[] = [];
  const methods = ["log", "info", "warn", "error", "debug", "trace"] as const;
  const originals = methods.map((method) => console[method]);
  for (const method of methods) {
    console[method] = (...args: unknown[]) => {
      captured.push(args.map((arg) => arg instanceof Error ? `${arg.message} ${arg.stack}` : String(arg)).join(" "));
    };
  }
  const results: unknown[] = [];
  try {
    const env = bffEnv(BFF_CREDENTIAL);
    const responders: (() => Promise<Response>)[] = [
      () => Promise.reject(new Error("ECONNRESET")),
      () => Promise.resolve(new Response(JSON.stringify({ title: "boom" }), { status: 500 })),
      () => Promise.resolve(new Response("<html>gateway timeout</html>", { status: 200 })),
      () => Promise.resolve(new Response(JSON.stringify({ code: "bad" }), { status: 400 })),
      () => Promise.resolve(new Response(null, { status: 401 })),
      () => Promise.resolve(new Response(null, { status: 403 })),
      () => Promise.resolve(new Response(JSON.stringify({ ok: 1 }), { status: 200, headers: { ETag: '"1"' } })),
    ];
    for (const respond of responders) {
      results.push(
        await createControlFetch(env, respond)(
          { method: "GET", path: "/api/me/workspaces", headers: { "x-elsa-bff-credential": "client-value" } },
          "hub-session",
        ),
      );
    }
  } finally {
    methods.forEach((method, index) => {
      console[method] = originals[index];
    });
  }
  const output = captured.join("\n") + JSON.stringify(results);
  assertFalse(output.includes(BFF_CREDENTIAL));
  assertFalse(output.includes("client-value"));
});

Deno.test("createControlFetch logs the Control status class and action", async () => {
  const lines: string[] = [];
  const original = console.info;
  console.info = (...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  };
  try {
    const env = {
      get(key: string) {
        return key === "ELSA_CONTROL_API_BASE_URL" ? "https://control.example.test" : undefined;
      },
    };
    await createControlFetch(env, async () => new Response(null, { status: 401 }))(
      { method: "POST", path: "/api/cloud/bootstrap", action: "bootstrap" },
      "hub-session",
    );
  } finally {
    console.info = original;
  }
  assertEquals(lines.includes("control_status=401 action=bootstrap"), true);
  assertFalse(lines.join("\n").includes("hub-session"));
});
