import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleCloudCheckout } from "./cloud.ts";
import {
  captureConsoleError,
  CLIENT_CONTROL_ORG,
  CONTROL_ORG,
  fakeStripe,
  type FakeSubscription,
  fakeSupabase,
  fakeUserClient,
  HUB_ORG,
  hubRequest,
  OTHER_ORG,
  storedOrgCustomer,
  testEnv,
  validatedLink,
} from "../_shared/cloud-billing_test_support.ts";

type Setup = {
  body?: Record<string, unknown>;
  memberships?: Array<{ organization_id: string; role: string }>;
  admin?: boolean;
  links?: Array<ReturnType<typeof validatedLink> | Record<string, unknown>>;
  storedCustomers?: Array<ReturnType<typeof storedOrgCustomer>>;
  failTables?: string[];
  subscriptions?: FakeSubscription[];
  env?: Record<string, string | undefined>;
};

function checkout(setup: Setup = {}) {
  const serviceClient = fakeSupabase({
    tables: {
      cloud_organization_links: [...(setup.links ?? [validatedLink()])],
      org_stripe_customers: [...(setup.storedCustomers ?? [])],
    },
    failTables: setup.failTables,
  });
  const { stripe, calls } = fakeStripe(setup.subscriptions);
  const run = async () => {
    const response = await handleCloudCheckout({
      req: hubRequest("create-checkout-session"),
      user: { id: "admin-1", email: "admin@example.test" },
      userClient: fakeUserClient({ memberships: setup.memberships, admin: setup.admin }) as never,
      serviceClient: serviceClient as never,
      body: (setup.body ?? { productType: "cloud", organizationId: HUB_ORG }) as never,
      corsHeaders: {},
      env: testEnv(setup.env),
      stripe: stripe as never,
    });
    return { response, payload: await response.json() };
  };
  const customerTouched = () => serviceClient.reads.includes("org_stripe_customers");
  return { run, calls, serviceClient, customerTouched };
}

Deno.test("a linked org admin's checkout carries the linked Control id, not the Hub or a client id", async () => {
  const { run, calls, serviceClient } = checkout({
    body: { productType: "cloud", organizationId: HUB_ORG, controlOrganizationId: CLIENT_CONTROL_ORG },
  });

  const { response } = await run();

  assertEquals(response.status, 200);
  const [session] = calls.sessions;
  const metadata = session.metadata as Record<string, string>;
  const subscriptionMetadata = (session.subscription_data as { metadata: Record<string, string> }).metadata;
  assertEquals(session.client_reference_id, CONTROL_ORG);
  assertEquals(metadata.elsa_control_organization_id, CONTROL_ORG);
  assertEquals(metadata.hub_organization_id, HUB_ORG);
  assertEquals(metadata.hub_user_id, "admin-1");
  assertEquals(subscriptionMetadata, metadata);
  assertEquals(session.customer, "cus_created");
  assertEquals(serviceClient.tables.org_stripe_customers, [storedOrgCustomer(HUB_ORG, "cus_created")]);
});

Deno.test("checkout reuses the org's stored Stripe customer", async () => {
  const { run, calls } = checkout({ storedCustomers: [storedOrgCustomer(HUB_ORG, "cus_org_a")] });

  const { response } = await run();

  assertEquals(response.status, 200);
  assertEquals(calls.customersCreated, 0);
  assertEquals(calls.sessions[0].customer, "cus_org_a");
});

Deno.test("checkout returns to the billed org's Cloud pages", async () => {
  const { run, calls } = checkout();

  await run();

  assertEquals(calls.sessions[0].success_url, "https://elsa-hub.example/dashboard/org/org-a/cloud?payment=success");
  assertEquals(
    calls.sessions[0].cancel_url,
    "https://elsa-hub.example/dashboard/org/org-a/cloud/billing?payment=cancelled",
  );
});

Deno.test("personal Cloud checkout is 400 and touches no customer", async () => {
  const { run, calls, customerTouched } = checkout({ body: { productType: "cloud" } });

  const { response, payload } = await run();

  assertEquals(response.status, 400);
  assertEquals(payload.error, "Cloud billing requires an organization");
  assertEquals(customerTouched(), false);
  assertEquals(calls.sessions.length, 0);
});

Deno.test("a live Stripe key is refused before any read", async () => {
  const { run, serviceClient } = checkout({ env: { STRIPE_SECRET_KEY: "rk_live_cloud" } });

  const { response, payload } = await run();

  assertEquals(response.status, 503);
  assertEquals(payload.error, "Cloud billing is sandbox-only");
  assertEquals(serviceClient.reads, []);
});

Deno.test("a member who is not an org admin is 403 and touches no customer", async () => {
  const { run, calls, customerTouched } = checkout({ admin: false });

  const { response } = await run();

  assertEquals(response.status, 403);
  assertEquals(customerTouched(), false);
  assertEquals(calls.sessions.length, 0);
});

for (
  const [name, memberships] of [
    ["an org the caller does not administer", [{ organization_id: OTHER_ORG, role: "admin" }]],
    ["a caller with no organization", []],
    ["a membership row without a role", [{ organization_id: HUB_ORG, role: "" }]],
  ] as const
) {
  Deno.test(`checkout for ${name} is 403 cloud_org_not_linked`, async () => {
    const { run, calls, customerTouched } = checkout({ memberships: [...memberships] });

    const { response, payload } = await run();

    assertEquals(response.status, 403);
    assertEquals(payload.code, "cloud_org_not_linked");
    assertEquals(customerTouched(), false);
    assertEquals(calls.sessions.length, 0);
  });
}

for (
  const [name, links] of [
    ["no link row", []],
    ["a link row without validated_at", [{ ...validatedLink(), validated_at: null }]],
    ["another org's link row", [validatedLink(OTHER_ORG)]],
  ] as const
) {
  Deno.test(`an admin's org with ${name} is 403 cloud_org_not_linked`, async () => {
    const { run, calls, customerTouched } = checkout({ links: [...links] });

    const { response, payload } = await run();

    assertEquals(response.status, 403);
    assertEquals(payload.code, "cloud_org_not_linked");
    assertEquals(customerTouched(), false);
    assertEquals(calls.sessions.length, 0);
  });
}

Deno.test("a link read error is a generic 500, not 'not linked', and touches no customer", async () => {
  const { run, calls, customerTouched } = checkout({ failTables: ["cloud_organization_links"] });

  const { result: { response, payload }, logged } = await captureConsoleError(run);

  assertEquals(response.status, 500);
  assertEquals(payload.error.includes("secret db detail"), false);
  assertStringIncludes(logged, "secret db detail");
  assertEquals(customerTouched(), false);
  assertEquals(calls.sessions.length, 0);
});

Deno.test("a stored-customer failure is the helper's generic 500", async () => {
  const { run, calls } = checkout({ failTables: ["org_stripe_customers"] });

  const { result: { response, payload } } = await captureConsoleError(run);

  assertEquals(response.status, 500);
  assertEquals(payload.error, "We couldn't set up your billing customer. Please try again later.");
  assertEquals(calls.sessions.length, 0);
});

for (const status of ["active", "trialing", "past_due", "unpaid", "paused", "incomplete"]) {
  Deno.test(`an existing ${status} Cloud subscription is 409 and opens no session`, async () => {
    const { run, calls } = checkout({
      subscriptions: [{ id: "sub_cloud", status, metadata: { kind: "cloud", product_type: "cloud" } }],
    });

    const { response, payload } = await run();

    assertEquals(response.status, 409);
    assertEquals(payload.code, "cloud_subscription_exists");
    assertEquals(calls.sessions.length, 0);
  });
}

Deno.test("Hub and ended Cloud subscriptions do not block checkout", async () => {
  const { run, calls } = checkout({
    subscriptions: [
      { id: "sub_hub", status: "active", metadata: { billing_type: "recurring" } },
      { id: "sub_old_cloud", status: "canceled", metadata: { kind: "cloud" } },
      { id: "sub_expired_cloud", status: "incomplete_expired", metadata: { kind: "cloud" } },
    ],
  });

  const { response } = await run();

  assertEquals(response.status, 200);
  assertEquals(calls.sessions.length, 1);
});
