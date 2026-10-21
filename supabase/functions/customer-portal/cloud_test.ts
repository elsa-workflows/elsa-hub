import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleCloudPortal } from "./cloud.ts";
import {
  ADMIN,
  captureConsoleError,
  fakeStripe,
  fakeSupabase,
  fakeUserClient,
  HUB_ORG,
  hubRequest,
  OTHER_ORG,
  storedOrgCustomer,
  testEnv,
} from "../_shared/cloud-billing_test_support.ts";

function portal(setup: {
  body?: Record<string, unknown>;
  admin?: boolean;
  failTables?: string[];
  env?: Record<string, string | undefined>;
} = {}) {
  const serviceClient = fakeSupabase({
    tables: {
      org_stripe_customers: [
        storedOrgCustomer(HUB_ORG, "cus_org_a"),
        storedOrgCustomer(OTHER_ORG, "cus_org_b"),
        { ...storedOrgCustomer(HUB_ORG, "cus_org_a_live"), livemode: true },
      ],
      user_stripe_customers: [{ user_id: ADMIN, livemode: false, stripe_customer_id: "cus_admin_personal" }],
    },
    failTables: setup.failTables,
  });
  const { stripe, calls } = fakeStripe();
  const run = async () => {
    const response = await handleCloudPortal({
      req: hubRequest("customer-portal"),
      user: { id: ADMIN },
      userClient: fakeUserClient({
        memberships: [
          { organization_id: HUB_ORG, role: "admin" },
          { organization_id: OTHER_ORG, role: "admin" },
        ],
        admin: setup.admin,
      }) as never,
      serviceClient: serviceClient as never,
      body: (setup.body ?? { productType: "cloud", organizationId: HUB_ORG }) as never,
      corsHeaders: {},
      env: testEnv(setup.env),
      stripe,
    });
    return { response, payload: await response.json() };
  };
  return { run, calls, serviceClient };
}

Deno.test("the portal opens only the requested org's stored test-mode customer", async () => {
  const { run, calls, serviceClient } = portal();

  const { response, payload } = await run();

  assertEquals(response.status, 200);
  assertEquals(payload.url, "https://billing.example/portal");
  assertEquals(calls.portals, [{
    customer: "cus_org_a",
    return_url: "https://elsa-hub.example/dashboard/org/org-a/cloud/billing",
  }]);
  assertEquals(calls.customersCreated, 0);
  assertEquals(serviceClient.reads.includes("user_stripe_customers"), false);
});

Deno.test("personal mode is 400 and never opens the caller's personal customer", async () => {
  const { run, calls, serviceClient } = portal({ body: { productType: "cloud" } });

  const { response } = await run();

  assertEquals(response.status, 400);
  assertEquals(calls.portals.length, 0);
  assertEquals(serviceClient.reads, []);
});

Deno.test("a member who is not an org admin is 403", async () => {
  const { run, calls } = portal({ admin: false });

  const { response } = await run();

  assertEquals(response.status, 403);
  assertEquals(calls.portals.length, 0);
});

Deno.test("a live Stripe key is refused", async () => {
  const { run, calls } = portal({ env: { STRIPE_SECRET_KEY: "sk_live_cloud" } });

  const { response } = await run();

  assertEquals(response.status, 503);
  assertEquals(calls.portals.length, 0);
});

Deno.test("a stored-customer read error is the helper's generic 500, not 404", async () => {
  const { run, calls } = portal({ failTables: ["org_stripe_customers"] });

  const { result: { response, payload } } = await captureConsoleError(run);

  assertEquals(response.status, 500);
  assertEquals(payload.error, "We couldn't set up your billing customer. Please try again later.");
  assertEquals(calls.portals.length, 0);
});

Deno.test("an org with no stored customer is 404", async () => {
  const { run, calls, serviceClient } = portal();
  serviceClient.tables.org_stripe_customers = [];

  const { response } = await run();

  assertEquals(response.status, 404);
  assertEquals(calls.portals.length, 0);
});
