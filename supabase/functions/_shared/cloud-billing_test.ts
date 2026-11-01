import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assertStripeTestMode,
  CLOUD_BILLING_LIVE_ENABLED_KEY,
  buildCloudCheckoutMetadata,
  isCloudBillingLiveEnabled,
  classifyStripeEvent,
  cloudCheckoutCancelPath,
  cloudCheckoutSuccessPath,
  CLOUD_PLAN_NAME,
  cloudOrganizationIdFromBody,
  cloudPortalReturnPath,
  isCloudRequest,
  isCloudStripeEvent,
  normalizeControlEntitlement,
  orgHasBlockingCloudSubscription,
  readControlEntitlement,
} from "./cloud-billing.ts";
import type { ControlCall, ControlFetch } from "./cloud-control.ts";
import { CONTROL_ORG, HUB_ORG } from "./cloud-billing_test_support.ts";

Deno.test("a Cloud request is recognized by productType or kind; Hub bodies are not", () => {
  assertEquals(isCloudRequest({ productType: "cloud" }), true);
  assertEquals(isCloudRequest({ kind: "cloud" }), true);
  assertEquals(isCloudRequest({ bundleId: "b1", organizationId: "org-1" }), false);
  assertEquals(isCloudRequest(null), false);
});

Deno.test("the organization id comes from the body, and blank means personal mode", () => {
  assertEquals(cloudOrganizationIdFromBody({ organizationId: " org-1 " }), "org-1");
  assertEquals(cloudOrganizationIdFromBody({ organizationId: "" }), null);
  assertEquals(cloudOrganizationIdFromBody({ organizationId: 42 }), null);
  assertEquals(cloudOrganizationIdFromBody(null), null);
});

Deno.test("checkout metadata carries the Hub user, Hub org, Control org and price", () => {
  assertEquals(
    buildCloudCheckoutMetadata({
      hubUserId: "u",
      hubOrganizationId: "hub",
      controlOrganizationId: "ctrl",
      priceId: "price_cloud",
    }),
    {
      kind: "cloud",
      product_type: "cloud",
      hub_user_id: "u",
      hub_organization_id: "hub",
      elsa_control_organization_id: "ctrl",
      cloud_price_id: "price_cloud",
    },
  );
});

Deno.test("return paths name the billed org, and fall back to the legacy /cloud routes", () => {
  assertEquals(cloudCheckoutSuccessPath("acme"), "/dashboard/org/acme/cloud?payment=success");
  assertEquals(cloudCheckoutCancelPath("acme"), "/dashboard/org/acme/cloud/billing?payment=cancelled");
  assertEquals(cloudPortalReturnPath("acme"), "/dashboard/org/acme/cloud/billing");
  assertEquals(cloudCheckoutSuccessPath(null), "/cloud?payment=success");
  assertEquals(cloudPortalReturnPath(undefined), "/cloud/billing");
});

function flagEnv(value: string | undefined) {
  return { get: (key: string) => (key === CLOUD_BILLING_LIVE_ENABLED_KEY ? value : undefined) };
}

Deno.test("a test key is allowed with the live flag off", () => {
  assertStripeTestMode("sk_test_cloud");
  assertStripeTestMode("rk_test_cloud", flagEnv(undefined));
  assertStripeTestMode("sk_test_cloud", flagEnv("false"));
});

Deno.test("a live key is refused when the live flag is off, unset, or malformed", () => {
  const live = "sk_live_MUST_NOT_LEAK";
  for (const flag of [undefined, "", "false", "TRUE", "true ", "1", "yes"]) {
    const error = assertThrows(() => assertStripeTestMode(live, flagEnv(flag)), Error, "sandbox-only");
    assertEquals(error.message.includes(live), false);
    assertEquals(error.message.includes("sk_live_"), false);
  }
  assertEquals(isCloudBillingLiveEnabled(undefined), false);
  assertEquals(isCloudBillingLiveEnabled(""), false);
  assertEquals(isCloudBillingLiveEnabled("1"), false);
  assertEquals(isCloudBillingLiveEnabled("yes"), false);
  assertEquals(isCloudBillingLiveEnabled("true"), true);
});

Deno.test("a live key is allowed only when the live flag is exactly true", () => {
  assertStripeTestMode("sk_live_cloud", flagEnv("true"));
  assertStripeTestMode("rk_live_cloud", flagEnv("true"));
  assertThrows(() => assertStripeTestMode("sk_live_cloud", flagEnv("1")), Error, "sandbox-only");
  assertThrows(() => assertStripeTestMode("sk_live_cloud", flagEnv("yes")), Error, "sandbox-only");
});

Deno.test("an unrecognised Stripe key is not configured and does not echo the value", () => {
  const unknown = "pk_test_MUST_NOT_LEAK";
  const error = assertThrows(() => assertStripeTestMode(unknown), Error, "not configured");
  assertEquals(error.message.includes(unknown), false);
  for (const missing of [undefined, "", "whsec_cloud"]) {
    assertThrows(() => assertStripeTestMode(missing), Error, "not configured");
  }
});

Deno.test("Cloud events are Cloud; Academy events are not", () => {
  assertEquals(isCloudStripeEvent({ data: { object: { metadata: { kind: "cloud" } } } }), true);
  assertEquals(isCloudStripeEvent({ data: { object: { metadata: { product_type: "cloud" } } } }), true);
  assertEquals(classifyStripeEvent({ data: { object: { metadata: { kind: "academy" } } } }), "academy");
  assertEquals(isCloudStripeEvent({ data: { object: { metadata: { kind: "academy" } } } }), false);
  assertEquals(classifyStripeEvent({ data: { object: { metadata: { billing_type: "recurring" } } } }), "hub");
  assertEquals(
    isCloudStripeEvent({
      data: { object: { parent: { subscription_details: { metadata: { kind: "cloud" } } } } },
    }),
    true,
  );
});

Deno.test("any Cloud subscription that has not ended blocks a second checkout", () => {
  for (const status of ["active", "trialing", "past_due", "unpaid", "paused", "incomplete"]) {
    assertEquals(orgHasBlockingCloudSubscription([{ status, metadata: { kind: "cloud" } }]), true, status);
  }
  for (const status of ["canceled", "incomplete_expired"]) {
    assertEquals(orgHasBlockingCloudSubscription([{ status, metadata: { kind: "cloud" } }]), false, status);
  }
  assertEquals(
    orgHasBlockingCloudSubscription([{ status: "active", metadata: { billing_type: "recurring" } }]),
    false,
  );
});

Deno.test("Control hosted-subscription Active/Trial become a plan; ended and empty bodies do not", () => {
  assertEquals(normalizeControlEntitlement({ subscriptionState: "Active", source: "hub" }), {
    planName: CLOUD_PLAN_NAME,
    status: "active",
    source: "hub",
  });
  assertEquals(normalizeControlEntitlement({ SubscriptionState: "Trial", Source: "control" }), {
    planName: CLOUD_PLAN_NAME,
    status: "trialing",
    source: "control",
  });
  assertEquals(normalizeControlEntitlement({ subscriptionState: "PastDue" })?.status, "past_due");
  assertEquals(normalizeControlEntitlement({ subscriptionState: "Constrained" })?.status, "constrained");
  assertEquals(normalizeControlEntitlement({ subscriptionState: "Suspended" })?.status, "paused");
  assertEquals(normalizeControlEntitlement({ subscriptionState: "Retained" }), null);
  assertEquals(normalizeControlEntitlement({ subscriptionState: "Deleted" }), null);
  assertEquals(normalizeControlEntitlement({ subscriptionState: null, billingLinked: true }), null);
  assertEquals(normalizeControlEntitlement(null), null);
  assertEquals(normalizeControlEntitlement("Active"), null);
});

Deno.test("readControlEntitlement calls Control with the Control org id and returns null on failure", async () => {
  const calls: ControlCall[] = [];
  const tokens: string[] = [];
  const ok: ControlFetch = async (call, token) => {
    calls.push(call);
    tokens.push(token);
    return { ok: true, status: 200, body: { subscriptionState: "Active", source: "hub" } };
  };

  assertEquals(
    await readControlEntitlement({
      accessToken: "hub-session",
      controlOrganizationId: CONTROL_ORG,
      controlFetch: ok,
    }),
    { planName: CLOUD_PLAN_NAME, status: "active", source: "hub" },
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].path, `/api/organizations/${CONTROL_ORG}/billing/hosted-subscription`);
  assertEquals(calls[0].path.includes(HUB_ORG), false);
  assertEquals(tokens, ["hub-session"]);

  assertEquals(
    await readControlEntitlement({
      accessToken: "hub-session",
      controlOrganizationId: CONTROL_ORG,
      controlFetch: async () => ({ ok: false, kind: "not_found" }),
    }),
    null,
  );
  assertEquals(
    await readControlEntitlement({
      accessToken: "hub-session",
      controlOrganizationId: CONTROL_ORG,
      controlFetch: async () => ({ ok: false, kind: "updating" }),
    }),
    null,
  );
  assertEquals(
    await readControlEntitlement({ controlOrganizationId: CONTROL_ORG, controlFetch: ok }),
    null,
  );
  assertEquals(
    await readControlEntitlement({
      accessToken: "hub-session",
      controlOrganizationId: "not-a-guid",
      controlFetch: ok,
    }),
    null,
  );
  assertEquals(calls.length, 1);
});

Deno.test("Cloud checkout, portal and status use #57's helper and never list customers by email", () => {
  const read = (path: string) => Deno.readTextFileSync(new URL(path, import.meta.url));
  const checkout = read("../create-checkout-session/cloud.ts");
  const portal = read("../customer-portal/cloud.ts");
  const status = read("../cloud-billing/handler.ts");

  for (const source of [checkout, portal, status]) {
    assertEquals(source.includes("customers.list("), false);
    assertEquals(source.includes('from "../_shared/stripe-customer.ts"'), true);
  }
  assertEquals(checkout.includes("getOrCreateStripeCustomer("), true);
  assertEquals(portal.includes("getStoredStripeCustomerId("), true);
  assertEquals(status.includes("getStoredStripeCustomerId("), true);
  assertEquals(portal.includes("getOrCreateStripeCustomer"), false);
  assertEquals(status.includes("getOrCreateStripeCustomer"), false);
  assertEquals(status.includes("readControlEntitlement("), true);
  assertEquals(status.includes("Promise.all("), true);
});

Deno.test("cloud-billing status sends the Hub session to Control hosted-subscription", () => {
  const index = Deno.readTextFileSync(new URL("../cloud-billing/index.ts", import.meta.url));
  assertEquals(index.includes('from "../_shared/cloud-control.ts"'), true);
  assertEquals(index.includes("createControlFetch()"), true);
  assertEquals(index.includes("accessToken: token"), true);
});
