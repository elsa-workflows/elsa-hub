import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleCloudCheckout } from "./cloud.ts";
import { CLOUD_CHECKOUT_FAILED } from "../_shared/cloud-billing.ts";
import { hasNoStore } from "../_shared/cloud-http.ts";
import { TAX_LOCATION_INVALID_CODE, TAX_LOCATION_INVALID_MESSAGE } from "../_shared/stripe-customer.ts";
import {
  assertNoStoreWithCors,
  captureConsoleError,
  CLIENT_CONTROL_ORG,
  CONTROL_ORG,
  type FakeCheckoutSession,
  fakeStripe,
  type FakeSubscription,
  fakeSupabase,
  fakeUserClient,
  HUB_ORG,
  hubRequest,
  minutesFromNow,
  OTHER_ORG,
  SITE_ORIGIN,
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
  checkoutSessions?: FakeCheckoutSession[];
  customerUpdateError?: Error;
  expireError?: Error;
  subscriptionListError?: Error;
  sessionListError?: Error;
  sessionCreateError?: Error;
  origin?: string;
  env?: Record<string, string | undefined>;
};

const CLOUD_METADATA = { kind: "cloud", product_type: "cloud" };
const SUCCESS_URL = `${SITE_ORIGIN}/dashboard/org/org-a/cloud?payment=success`;

/** An open Cloud session matching what this request would create, unless overridden. */
function openCloudSession(
  overrides: Partial<Omit<FakeCheckoutSession, "metadata">> & { metadata?: Record<string, string> } = {},
): FakeCheckoutSession {
  return {
    id: "cs_cloud",
    status: "open",
    url: "https://checkout.example/open-cloud",
    success_url: SUCCESS_URL,
    expires_at: minutesFromNow(20),
    ...overrides,
    metadata: {
      ...CLOUD_METADATA,
      hub_user_id: "admin-1",
      hub_organization_id: HUB_ORG,
      elsa_control_organization_id: CONTROL_ORG,
      cloud_price_id: "price_test_cloud",
      ...overrides.metadata,
    },
  };
}

function checkout(setup: Setup = {}) {
  const serviceClient = fakeSupabase({
    tables: {
      cloud_organization_links: [...(setup.links ?? [validatedLink()])],
      org_stripe_customers: [...(setup.storedCustomers ?? [])],
    },
    failTables: setup.failTables,
  });
  const userClient = fakeUserClient({ memberships: setup.memberships, admin: setup.admin });
  const { stripe, calls } = fakeStripe(setup.subscriptions, {
    checkoutSessions: setup.checkoutSessions,
    customerUpdateError: setup.customerUpdateError,
    expireError: setup.expireError,
    subscriptionListError: setup.subscriptionListError,
    sessionListError: setup.sessionListError,
    sessionCreateError: setup.sessionCreateError,
  });
  const run = async () => {
    const response = await handleCloudCheckout({
      req: hubRequest("create-checkout-session", setup.origin),
      user: { id: "admin-1", email: "admin@example.test" },
      userClient: userClient as never,
      serviceClient: serviceClient as never,
      body: (setup.body ?? { productType: "cloud", organizationId: HUB_ORG }) as never,
      env: testEnv(setup.env),
      stripe: stripe as never,
    });
    return { response, payload: await response.json() };
  };
  const customerTouched = () => serviceClient.reads.includes("org_stripe_customers");
  return { run, calls, serviceClient, userClient, customerTouched };
}

Deno.test("a linked org admin's checkout carries the linked Control id, not the Hub or a client id", async () => {
  const { run, calls, serviceClient } = checkout({
    body: { productType: "cloud", organizationId: HUB_ORG, controlOrganizationId: CLIENT_CONTROL_ORG },
  });

  const { response } = await run();

  assertEquals(response.status, 200);
  assertEquals(hasNoStore(response), true);
  const [session] = calls.sessions;
  const metadata = session.metadata as Record<string, string>;
  const subscriptionMetadata = (session.subscription_data as { metadata: Record<string, string> }).metadata;
  assertEquals(session.client_reference_id, CONTROL_ORG);
  assertEquals(metadata.elsa_control_organization_id, CONTROL_ORG);
  assertEquals(metadata.hub_organization_id, HUB_ORG);
  assertEquals(metadata.hub_user_id, "admin-1");
  assertEquals(metadata.cloud_price_id, "price_test_cloud");
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

Deno.test("a foreign Origin returns to the Hub site, not to the foreign host", async () => {
  const { run, calls } = checkout({ origin: "https://attacker.example" });

  await run();

  assertEquals(calls.sessions[0].success_url, SUCCESS_URL);
  assertEquals(calls.sessions[0].cancel_url, `${SITE_ORIGIN}/dashboard/org/org-a/cloud/billing?payment=cancelled`);
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
  ] as const
) {
  Deno.test(`checkout for ${name} is 403 and touches no customer`, async () => {
    const { run, calls, customerTouched } = checkout({ memberships: [...memberships] });

    const { response } = await run();

    assertEquals(response.status, 403);
    assertEquals(customerTouched(), false);
    assertEquals(calls.sessions.length, 0);
  });
}

Deno.test("is_org_admin alone decides who may check out; membership rows are not read", async () => {
  const { run, calls, userClient } = checkout({
    memberships: [{ organization_id: HUB_ORG, role: "member" }],
    admin: true,
  });

  const { response } = await run();

  assertEquals(response.status, 200);
  assertEquals(calls.sessions.length, 1);
  assertEquals(userClient.reads.includes("organization_members"), false);
});

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
  assertNoStoreWithCors(response);
  assertEquals(payload.error, "We couldn't set up your billing customer. Please try again later.");
  assertEquals(calls.sessions.length, 0);
});

for (const status of ["active", "trialing", "past_due", "unpaid", "paused", "incomplete"]) {
  Deno.test(`an existing ${status} Cloud subscription is 409 and opens no session`, async () => {
    const { run, calls } = checkout({
      subscriptions: [{ id: "sub_cloud", status, metadata: CLOUD_METADATA }],
    });

    const { response, payload } = await run();

    assertEquals(response.status, 409);
    assertEquals(payload.code, "cloud_subscription_exists");
    assertEquals(calls.sessions.length, 0);
  });
}

Deno.test("an open Cloud checkout for the same orgs, price and return URL is reused", async () => {
  const { run, calls } = checkout({ checkoutSessions: [openCloudSession()] });

  const { response, payload } = await run();

  assertEquals(response.status, 200);
  assertEquals(payload.checkoutUrl, "https://checkout.example/open-cloud");
  assertEquals(calls.sessions.length, 0);
  assertEquals(calls.expired, []);
  assertEquals(calls.sessionLists, [{ customer: "cus_created", status: "open", limit: 100 }]);
});

for (
  const [name, stale] of [
    ["another Control org", openCloudSession({ metadata: { elsa_control_organization_id: CLIENT_CONTROL_ORG } })],
    ["another Hub org", openCloudSession({ metadata: { hub_organization_id: OTHER_ORG } })],
    ["another price", openCloudSession({ metadata: { cloud_price_id: "price_old_cloud" } })],
    ["no recorded price", { ...openCloudSession(), metadata: { ...CLOUD_METADATA } }],
    ["another return URL", openCloudSession({ success_url: `${SITE_ORIGIN}/cloud?payment=success` })],
    ["less than 10 minutes left", openCloudSession({ expires_at: minutesFromNow(9) })],
  ] as const
) {
  Deno.test(`an open Cloud checkout for ${name} is expired and a new one created`, async () => {
    const { run, calls } = checkout({ checkoutSessions: [stale] });

    const { response, payload } = await run();

    assertEquals(response.status, 200);
    assertEquals(calls.expired, ["cs_cloud"]);
    assertEquals(calls.sessions.length, 1);
    assertEquals(payload.checkoutUrl, "https://checkout.example/session");
  });
}

Deno.test("a matching open Cloud checkout is reused and a stale one beside it expired", async () => {
  const { run, calls } = checkout({
    checkoutSessions: [
      openCloudSession({ id: "cs_stale", metadata: { cloud_price_id: "price_old_cloud" } }),
      openCloudSession(),
    ],
  });

  const { payload } = await run();

  assertEquals(payload.checkoutUrl, "https://checkout.example/open-cloud");
  assertEquals(calls.expired, ["cs_stale"]);
  assertEquals(calls.sessions.length, 0);
});

Deno.test("a stale session that will not expire is logged and a new one still created", async () => {
  const { run, calls } = checkout({
    checkoutSessions: [openCloudSession({ metadata: { cloud_price_id: "price_old_cloud" } })],
    expireError: new Error("Only Checkout Sessions with a status of `open` can be expired."),
  });

  const { result: { response, payload }, logged } = await captureConsoleError(run);

  assertEquals(response.status, 200);
  assertEquals(payload.checkoutUrl, "https://checkout.example/session");
  assertEquals(calls.expired, ["cs_cloud"]);
  assertStringIncludes(logged, "cs_cloud");
  assertStringIncludes(logged, "can be expired");
});

Deno.test("an open Hub checkout session does not block a Cloud checkout", async () => {
  const { run, calls } = checkout({
    checkoutSessions: [
      {
        id: "cs_hub",
        status: "open",
        url: "https://checkout.example/open-hub",
        expires_at: minutesFromNow(20),
        metadata: { bundle_id: "b1" },
      },
    ],
  });

  const { response, payload } = await run();

  assertEquals(response.status, 200);
  assertEquals(payload.checkoutUrl, "https://checkout.example/session");
  assertEquals(calls.sessions.length, 1);
  assertEquals(calls.expired, []);
});

Deno.test("a new Cloud session expires soon after Stripe's 30-minute minimum", async () => {
  const { run, calls } = checkout();
  const now = Math.floor(Date.now() / 1000);

  await run();

  const expiresAt = calls.sessions[0].expires_at as number;
  assert(expiresAt > now + 30 * 60, `expires_at ${expiresAt} is within Stripe's 30-minute minimum`);
  assert(expiresAt <= now + 35 * 60, `expires_at ${expiresAt} is more than 35 minutes out`);
});

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

Deno.test("an open Cloud checkout with 10 minutes left is still reused", async () => {
  const { run, calls } = checkout({ checkoutSessions: [openCloudSession({ expires_at: minutesFromNow(10) + 5 })] });

  const { payload } = await run();

  assertEquals(payload.checkoutUrl, "https://checkout.example/open-cloud");
  assertEquals(calls.expired, []);
  assertEquals(calls.sessions.length, 0);
});

const SECRET_STRIPE_DETAIL = "secret stripe detail: rate limited on acct_123";

for (
  const [name, failure] of [
    ["subscriptions.list", { subscriptionListError: new Error(SECRET_STRIPE_DETAIL) }],
    ["checkout.sessions.list", { sessionListError: new Error(SECRET_STRIPE_DETAIL) }],
    ["checkout.sessions.create", { sessionCreateError: new Error(SECRET_STRIPE_DETAIL) }],
  ] as const
) {
  Deno.test(`a rejecting ${name} is a logged, generic, no-store 500`, async () => {
    const { run } = checkout(failure);

    const { result: { response, payload }, logged } = await captureConsoleError(run);

    assertEquals(response.status, 500);
    assertNoStoreWithCors(response);
    assertEquals(payload, { error: CLOUD_CHECKOUT_FAILED });
    assertStringIncludes(logged, SECRET_STRIPE_DETAIL);
  });
}

Deno.test("Stripe's customer_tax_location_invalid is the Hub's 400, no-store, without Stripe's text", async () => {
  const { run } = checkout({
    sessionCreateError: Object.assign(new Error(SECRET_STRIPE_DETAIL), { code: TAX_LOCATION_INVALID_CODE }),
  });

  const { result: { response, payload } } = await captureConsoleError(run);

  assertEquals(response.status, 400);
  assertNoStoreWithCors(response);
  assertEquals(payload, { error: TAX_LOCATION_INVALID_MESSAGE, code: TAX_LOCATION_INVALID_CODE });
});

Deno.test("customer_tax_location_invalid from the customer update is the same 400, and no session is created", async () => {
  const { run, calls } = checkout({
    customerUpdateError: Object.assign(new Error(SECRET_STRIPE_DETAIL), { code: TAX_LOCATION_INVALID_CODE }),
  });

  const { result: { response, payload } } = await captureConsoleError(run);

  assertEquals(response.status, 400);
  assertNoStoreWithCors(response);
  assertEquals(payload, { error: TAX_LOCATION_INVALID_MESSAGE, code: TAX_LOCATION_INVALID_CODE });
  assertEquals(calls.sessions.length, 0);
});
