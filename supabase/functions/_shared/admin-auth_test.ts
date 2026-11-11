import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { type AdminAuthDeps, type AdminUserCheck, bearerToken, guardAdminPost, safeEqual } from "./admin-auth.ts";

const CORS = { "Access-Control-Allow-Origin": "*" };
const SERVICE_KEY = "service-role-key-for-tests";

function deps(userCheck: AdminUserCheck = "invalid", serviceRoleKey: string | undefined = SERVICE_KEY) {
  const calls: string[] = [];
  const value: AdminAuthDeps = {
    serviceRoleKey: () => serviceRoleKey,
    checkUserToken: (token) => {
      calls.push(token);
      return Promise.resolve(userCheck);
    },
  };
  return { value, calls };
}

function request(method: string, authorization?: string): Request {
  const headers = new Headers();
  if (authorization !== undefined) headers.set("Authorization", authorization);
  return new Request("https://example.test/fn", { method, headers, body: method === "GET" ? undefined : "{}" });
}

Deno.test("any method other than POST gets 405 with an Allow header, even with the service role key", async () => {
  for (const method of ["GET", "PUT", "PATCH", "DELETE"]) {
    const res = await guardAdminPost(request(method, `Bearer ${SERVICE_KEY}`), CORS, deps().value);
    assertEquals(res?.status, 405, method);
    assertEquals(res?.headers.get("Allow"), "POST, OPTIONS");
    await res?.body?.cancel();
  }
});

Deno.test("POST without credentials gets 401 and never reaches the user check", async () => {
  for (const header of [undefined, "", "Bearer", "Bearer ", "Basic abc", SERVICE_KEY]) {
    const d = deps("admin");
    const res = await guardAdminPost(request("POST", header), CORS, d.value);
    assertEquals(res?.status, 401, String(header));
    assertEquals(d.calls.length, 0, String(header));
    await res?.body?.cancel();
  }
});

Deno.test("POST with the service role key passes without a user lookup", async () => {
  const d = deps("invalid");
  const res = await guardAdminPost(request("POST", `Bearer ${SERVICE_KEY}`), CORS, d.value);
  assertEquals(res, null);
  assertEquals(d.calls.length, 0);
});

Deno.test("a platform admin JWT passes", async () => {
  const d = deps("admin");
  const res = await guardAdminPost(request("POST", "Bearer user.jwt.token"), CORS, d.value);
  assertEquals(res, null);
  assertEquals(d.calls, ["user.jwt.token"]);
});

Deno.test("a signed-in user who is not an admin gets 403", async () => {
  const res = await guardAdminPost(request("POST", "Bearer user.jwt.token"), CORS, deps("not_admin").value);
  assertEquals(res?.status, 403);
  await res?.body?.cancel();
});

Deno.test("a token that is neither the service role key nor a valid JWT gets 401", async () => {
  const res = await guardAdminPost(request("POST", "Bearer nonsense"), CORS, deps("invalid").value);
  assertEquals(res?.status, 401);
  await res?.body?.cancel();
});

Deno.test("fails closed when the service role key is not configured", async () => {
  const d = deps("invalid", undefined);
  const res = await guardAdminPost(request("POST", "Bearer "), CORS, d.value);
  assertEquals(res?.status, 401);
  const res2 = await guardAdminPost(request("POST", "Bearer anything"), CORS, d.value);
  assertEquals(res2?.status, 401);
  await res?.body?.cancel();
  await res2?.body?.cancel();
});

Deno.test("error responses keep the CORS headers and a JSON body", async () => {
  const res = await guardAdminPost(request("POST"), CORS, deps().value);
  assertEquals(res?.headers.get("Access-Control-Allow-Origin"), "*");
  assertEquals(res?.headers.get("Content-Type"), "application/json");
  assertEquals(await res?.json(), { error: "Unauthorized" });
});

Deno.test("safeEqual and bearerToken edge cases", () => {
  assertEquals(safeEqual("a", "a"), true);
  assertEquals(safeEqual("a", "b"), false);
  assertEquals(safeEqual("", ""), false);
  assertEquals(safeEqual("abc", "abcd"), false);
  assertEquals(bearerToken(request("POST", "bearer tok")), "tok");
  assertEquals(bearerToken(request("POST", "Bearer a b")), null);
});
