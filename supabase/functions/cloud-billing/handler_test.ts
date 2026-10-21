import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleCloudBillingStatus } from "./handler.ts";
import {
  ADMIN,
  captureConsoleError,
  CONTROL_ORG,
  fakeStripe,
  type FakeSubscription,
  fakeSupabase,
  fakeUserClient,
  HUB_ORG,
  OTHER_ORG,
  storedOrgCustomer,
  validatedLink,
  testEnv,
} from "../_shared/cloud-billing_test_support.ts";

function status(setup: {
  body?: unknown;
  memberships?: Array<{ organization_id: string; role: string }>;
  admin?: boolean;
  storedCustomers?: Array<ReturnType<typeof storedOrgCustomer>>;
  links?: Array<ReturnType<typeof validatedLink>>;
  failTables?: string[];
  subscriptions?: FakeSubscription[];
} = {}) {
  const serviceClient = fakeSupabase({
    tables: {
      org_stripe_customers: setup.storedCustomers ?? [storedOrgCustomer(HUB_ORG, "cus_org_a")],
      user_stripe_customers: [{ user_id: ADMIN, livemode: false, stripe_customer_id: "cus_admin_personal" }],
      cloud_organization_links: setup.links ?? [validatedLink()],
    },
    failTables: setup.failTables,
  });
  const { stripe, calls } = fakeStripe(setup.subscriptions);
  const run = async () => {
    const response = await handleCloudBillingStatus({
      user: { id: ADMIN },
      userClient: fakeUserClient({ memberships: setup.memberships, admin: setup.admin }) as never,
      serviceClient: serviceClient as never,
      body: "body" in setup ? setup.body : { organizationId: HUB_ORG },
      env: testEnv(),
      stripe: () => stripe as never,
    });
    return { response, payload: await response.json() };
  };
  return { run, calls, serviceClient };
}

Deno.test("status reports the org's stored customer, link and Cloud subscriptions only", async () => {
  const { run, calls } = status({
    subscriptions: [
      { id: "sub_cloud", status: "active", metadata: { kind: "cloud" } },
      { id: "sub_hub", status: "active", metadata: { billing_type: "recurring" } },
    ],
  });

  const { response, payload } = await run();

  assertEquals(response.status, 200);
  assertEquals(response.headers.get("Cache-Control"), "no-store");
  assertEquals(calls.subscriptionLists[0].customer, "cus_org_a");
  assertEquals(payload.billingAccount, "linked");
  assertEquals(payload.cloudLink, "linked");
  assertEquals(payload.controlOrganizationId, CONTROL_ORG);
  assertEquals(payload.canManage, true);
  assertEquals(payload.subscriptions.map((sub: { id: string }) => sub.id), ["sub_cloud"]);
  assertEquals(payload.subscriptions[0].planName, "Elsa Cloud");
  assertEquals(calls.subscriptionLists, [{ customer: "cus_org_a", limit: 100 }]);
});

Deno.test("a busy customer's live Cloud subscription is found behind many ended Hub subscriptions", async () => {
  const endedHub = Array.from({ length: 25 }, (_, index) => ({
    id: `sub_hub_${index}`,
    status: "canceled",
    metadata: { billing_type: "recurring" },
  }));
  const { run, calls } = status({
    subscriptions: [...endedHub, { id: "sub_cloud", status: "active", metadata: { kind: "cloud" } }],
  });

  const { payload } = await run();

  assertEquals(payload.subscriptions.map((sub: { id: string }) => sub.id), ["sub_cloud"]);
  assertEquals(calls.subscriptionLists.length, 1);
});

Deno.test("ended Cloud subscriptions are listed only when no live one is on the first page", async () => {
  const { run, calls } = status({
    subscriptions: [
      { id: "sub_hub", status: "active", metadata: { billing_type: "recurring" } },
      { id: "sub_old_cloud", status: "canceled", metadata: { kind: "cloud" } },
    ],
  });

  const { payload } = await run();

  assertEquals(payload.subscriptions.map((sub: { id: string }) => sub.id), ["sub_old_cloud"]);
  assertEquals(calls.subscriptionLists, [
    { customer: "cus_org_a", limit: 100 },
    { customer: "cus_org_a", status: "ended", limit: 100 },
  ]);
});

Deno.test("a stored customer without a link still reports billingAccount, so the portal stays reachable", async () => {
  const { run } = status({ links: [] });

  const { payload } = await run();

  assertEquals(payload.billingAccount, "linked");
  assertEquals(payload.cloudLink, "missing");
  assertEquals(payload.controlOrganizationId, null);
});

Deno.test("an org without a stored customer is missing and lists nothing in Stripe", async () => {
  const { run, calls } = status({ storedCustomers: [] });

  const { payload } = await run();

  assertEquals(payload.billingAccount, "missing");
  assertEquals(payload.subscriptions, []);
  assertEquals(calls.subscriptionLists.length, 0);
});

Deno.test("a member who is not an admin can read status but not manage", async () => {
  const { run } = status({ admin: false });

  const { response, payload } = await run();

  assertEquals(response.status, 200);
  assertEquals(payload.canManage, false);
});

Deno.test("a non-member is 403", async () => {
  const { run, serviceClient } = status({ memberships: [{ organization_id: OTHER_ORG, role: "admin" }] });

  const { response } = await run();

  assertEquals(response.status, 403);
  assertEquals(serviceClient.reads, []);
});

for (const body of [{}, null, { organizationId: "  " }]) {
  Deno.test(`personal mode (${JSON.stringify(body)}) is 400 and reads no personal customer`, async () => {
    const { run, serviceClient } = status({ body });

    const { response } = await run();

    assertEquals(response.status, 400);
    assertEquals(serviceClient.reads, []);
  });
}

Deno.test("a stored-customer read error is the helper's generic 500, not missing", async () => {
  const { run } = status({ failTables: ["org_stripe_customers"] });

  const { result: { response, payload } } = await captureConsoleError(run);

  assertEquals(response.status, 500);
  assertEquals(payload.error, "We couldn't set up your billing customer. Please try again later.");
});

Deno.test("a link read error is a generic 500 and logs the detail", async () => {
  const { run } = status({ failTables: ["cloud_organization_links"] });

  const { result: { response, payload }, logged } = await captureConsoleError(run);

  assertEquals(response.status, 500);
  assertEquals(payload.error.includes("secret db detail"), false);
  assertStringIncludes(logged, "secret db detail");
});
