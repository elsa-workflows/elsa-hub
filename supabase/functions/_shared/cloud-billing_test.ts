import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assertStripeTestMode,
  CLOUD_BILLING_LIVE_ENABLED_KEY,
  CLOUD_BILLING_UNAVAILABLE_CODE,
  CLOUD_CHECKOUT_FAILED,
  CLOUD_LINK_READ_FAILED,
  buildCloudCheckoutMetadata,
  cloudBillingUnavailablePayload,
  isCloudBillingLiveEnabled,
  classifyStripeEvent,
  cloudCheckoutCancelPath,
  cloudCheckoutSuccessPath,
  CLOUD_PLAN_NAME,
  cloudOrganizationIdFromBody,
  cloudPortalReturnPath,
  CLOUD_ENTITLEMENT_UNAVAILABLE_MESSAGE,
  CLOUD_SUBSCRIPTION_SUSPENDED_MESSAGE,
  CONTROL_NO_BILLING_LINKAGE_ACTION,
  controlSubscriptionBlocksCheckout,
  isControlNeverSubscribedBody,
  isCloudRequest,
  isCloudStripeEvent,
  normalizeControlEntitlement,
  orgHasAnyCloudSubscription,
  orgHasBlockingCloudSubscription,
  readCloudPriceId,
  readControlCheckoutEntitlement,
  readControlEntitlement,
} from "./cloud-billing.ts";
import type { ControlCall, ControlFetch } from "./cloud-control.ts";
import {
  CLIENT_CONTROL_ORG,
  CONTROL_ORG,
  HUB_ORG,
  controlHostedSubscriptionBody,
  controlNeverSubscribedBody,
  withForwardRecoveryAction,
} from "./cloud-billing_test_support.ts";

Deno.test("a Cloud request is recognized by productType or kind; Hub bodies are not", () => {
  assertEquals(isCloudRequest({ productType: "cloud" }), true);
  assertEquals(isCloudRequest({ kind: "cloud" }), true);
  assertEquals(isCloudRequest({ bundleId: "b1", organizationId: "org-1" }), false);
  assertEquals(isCloudRequest({ productId: "p1", organizationId: "org-1" }), false);
  assertEquals(isCloudRequest(null), false);
});

Deno.test("credits and product checkout bodies are not Cloud requests, so the Suspended guard does not apply", () => {
  assertEquals(isCloudRequest({ bundleId: "credits-bundle", organizationId: CONTROL_ORG }), false);
  assertEquals(isCloudRequest({ productId: "credits-product", organizationId: CONTROL_ORG }), false);
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

Deno.test("the Cloud billing gate payload is 503 billing_unavailable and never echoes the key", () => {
  const leaked = "sk_live_MUST_NOT_LEAK";
  const payload = cloudBillingUnavailablePayload(new Error("Cloud billing is sandbox-only"));
  assertEquals(payload, { error: "Cloud billing is sandbox-only", code: CLOUD_BILLING_UNAVAILABLE_CODE });
  assertEquals(JSON.stringify(payload).includes(leaked), false);
});

Deno.test("STRIPE_CLOUD_PRICE_ID is the Cloud price for whichever mode the key is in", () => {
  assertEquals(readCloudPriceId({ get: (key) => key === "STRIPE_CLOUD_PRICE_ID" ? "price_from_primary" : undefined }), "price_from_primary");
  assertEquals(readCloudPriceId({ get: (key) => key === "CLOUD_STRIPE_PRICE_ID" ? "price_from_fallback" : undefined }), "price_from_fallback");
  assertThrows(() => readCloudPriceId({ get: () => undefined }), Error, "not configured");
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

Deno.test("orgHasAnyCloudSubscription is true for any Cloud subscription, including ended ones", () => {
  for (const status of ["active", "canceled", "incomplete_expired", "past_due"]) {
    assertEquals(orgHasAnyCloudSubscription([{ status, metadata: { kind: "cloud" } }]), true, status);
  }
  assertEquals(
    orgHasAnyCloudSubscription([{ status: "active", metadata: { billing_type: "recurring" } }]),
    false,
  );
  assertEquals(orgHasAnyCloudSubscription([]), false);
});

Deno.test("Control hosted-subscription Active/Trial become a plan; ended and empty bodies do not", () => {
  assertEquals(normalizeControlEntitlement(controlHostedSubscriptionBody("Active", { source: "hub" })), {
    planName: CLOUD_PLAN_NAME,
    status: "active",
    source: "hub",
  });
  assertEquals(normalizeControlEntitlement(controlHostedSubscriptionBody("Trial")), {
    planName: CLOUD_PLAN_NAME,
    status: "trialing",
    source: "control",
  });
  assertEquals(normalizeControlEntitlement({ SubscriptionState: "Trial", Source: "control" }), {
    planName: CLOUD_PLAN_NAME,
    status: "trialing",
    source: "control",
  });
  assertEquals(normalizeControlEntitlement(controlHostedSubscriptionBody("PastDue"))?.status, "past_due");
  assertEquals(normalizeControlEntitlement(controlHostedSubscriptionBody("Constrained"))?.status, "constrained");
  assertEquals(normalizeControlEntitlement(controlHostedSubscriptionBody("Suspended"))?.status, "ended");
  assertEquals(normalizeControlEntitlement(controlHostedSubscriptionBody("Retained"))?.status, "ended");
  assertEquals(normalizeControlEntitlement(controlHostedSubscriptionBody("Deleted")), null);
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
    return { ok: true, status: 200, body: controlHostedSubscriptionBody("Active", { source: "hub" }) };
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
  for (const source of [checkout, portal, status]) {
    assertEquals(source.includes("cloudBillingUnavailablePayload("), true);
  }
  assertEquals(portal.includes("getOrCreateStripeCustomer"), false);
  assertEquals(status.includes("getOrCreateStripeCustomer"), false);
  assertEquals(status.includes("readControlHostedSubscription("), true);
  assertEquals(status.includes("Promise.all("), true);
});

Deno.test("cloud-billing status sends the Hub session to Control hosted-subscription", () => {
  const index = Deno.readTextFileSync(new URL("../cloud-billing/index.ts", import.meta.url));
  assertEquals(index.includes('from "../_shared/cloud-control.ts"'), true);
  assertEquals(index.includes("createControlFetch()"), true);
  assertEquals(index.includes("accessToken: token"), true);
});

Deno.test("signed Cloud billing error lines (elsa-control#936)", () => {
  assertEquals(
    CLOUD_LINK_READ_FAILED,
    "We couldn't check this organization's Elsa Cloud link. Refresh this page to check again.",
  );
  assertEquals(CLOUD_CHECKOUT_FAILED, "We couldn't start Elsa Cloud checkout. Please try again.");
});


Deno.test("the signed Suspended and entitlement-unavailable lines are exact", () => {
  assertEquals(
    CLOUD_SUBSCRIPTION_SUSPENDED_MESSAGE,
    "Your Elsa Cloud plan isn't active. For help, email hello@valence.works.",
  );
  assertEquals(
    CLOUD_ENTITLEMENT_UNAVAILABLE_MESSAGE,
    "We couldn't load billing. Refresh this page to check again.",
  );
});

Deno.test("controlSubscriptionBlocksCheckout blocks Suspended unless recoveryAction is Subscribe, and always blocks Retained", () => {
  assertEquals(controlSubscriptionBlocksCheckout("Suspended", null), true);
  assertEquals(controlSubscriptionBlocksCheckout("suspended", null), true);
  assertEquals(controlSubscriptionBlocksCheckout("Suspended", "UpdatePaymentMethod"), true);
  assertEquals(controlSubscriptionBlocksCheckout("Suspended", "Subscribe"), false);
  assertEquals(controlSubscriptionBlocksCheckout("Retained", null), true);
  assertEquals(controlSubscriptionBlocksCheckout("retained", "UpdatePaymentMethod"), true);
  assertEquals(controlSubscriptionBlocksCheckout("Retained", "Subscribe"), true);
  assertEquals(controlSubscriptionBlocksCheckout("Deleted", null), false);
  assertEquals(controlSubscriptionBlocksCheckout("Active", null), false);
  assertEquals(controlSubscriptionBlocksCheckout("Active", "Subscribe"), false);
  assertEquals(controlSubscriptionBlocksCheckout(null, null), false);
});

Deno.test("readControlCheckoutEntitlement fails closed on a Control error or timeout", async () => {
  const updating: ControlFetch = async () => ({ ok: false, kind: "updating" });
  const forbidden: ControlFetch = async () => ({ ok: false, kind: "forbidden" });
  assertEquals(
    await readControlCheckoutEntitlement({
      accessToken: "hub-session",
      controlOrganizationId: CONTROL_ORG,
      controlFetch: updating,
    }),
    { ok: false },
  );
  assertEquals(
    await readControlCheckoutEntitlement({
      accessToken: "hub-session",
      controlOrganizationId: CONTROL_ORG,
      controlFetch: forbidden,
    }),
    { ok: false },
  );
  assertEquals(
    await readControlCheckoutEntitlement({
      controlOrganizationId: CONTROL_ORG,
    }),
    { ok: false },
  );
});

Deno.test("readControlCheckoutEntitlement treats a 404 as no entitlement, not an outage", async () => {
  const missing: ControlFetch = async () => ({ ok: false, kind: "not_found" });
  assertEquals(
    await readControlCheckoutEntitlement({
      accessToken: "hub-session",
      controlOrganizationId: CONTROL_ORG,
      controlFetch: missing,
    }),
    { ok: true, subscriptionState: null, recoveryAction: null },
  );
});

/** Real Control never-subscribed 200 (HostedSubscriptionManagementResponse). */
const neverSubscribedBody = controlNeverSubscribedBody();

Deno.test("readControlCheckoutEntitlement fails closed when a 200 body has no readable subscriptionState", async () => {
  for (const body of [{}, null, [], "oops", { foo: 1 }, { subscriptionState: 3 }]) {
    const fetch: ControlFetch = async () => ({ ok: true, status: 200, body });
    assertEquals(
      await readControlCheckoutEntitlement({
        accessToken: "hub-session",
        controlOrganizationId: CONTROL_ORG,
        controlFetch: fetch,
      }),
      { ok: false },
      JSON.stringify(body),
    );
  }
});

Deno.test("a Control never-subscribed 200 is accepted only for the exact wire body", async () => {
  assertEquals(CONTROL_NO_BILLING_LINKAGE_ACTION, "no-billing-linkage");
  assertEquals(isControlNeverSubscribedBody(neverSubscribedBody, CONTROL_ORG), true);
  const fetch: ControlFetch = async () => ({ ok: true, status: 200, body: neverSubscribedBody });
  assertEquals(
    await readControlCheckoutEntitlement({
      accessToken: "hub-session",
      controlOrganizationId: CONTROL_ORG,
      controlFetch: fetch,
    }),
    { ok: true, subscriptionState: null, recoveryAction: null },
  );
});

Deno.test("a never-subscribed 200 fails closed when any required field is mutated", async () => {
  const { subscriptionState: _omitState, ...missingState } = neverSubscribedBody;
  const variants: Array<[string, unknown]> = [
    ["wrong organizationId", { ...neverSubscribedBody, organizationId: CLIENT_CONTROL_ORG }],
    ["missing organizationId", { subscriptionState: null, billingLinked: false, managementAction: CONTROL_NO_BILLING_LINKAGE_ACTION }],
    ["missing subscriptionState", missingState],
    ["undefined subscriptionState", { ...neverSubscribedBody, subscriptionState: undefined }],
    ["empty subscriptionState", { ...neverSubscribedBody, subscriptionState: "" }],
    ["whitespace subscriptionState", { ...neverSubscribedBody, subscriptionState: "  " }],
    ["billingLinked true", { ...neverSubscribedBody, billingLinked: true }],
    ["missing billingLinked", { organizationId: CONTROL_ORG, subscriptionState: null, managementAction: CONTROL_NO_BILLING_LINKAGE_ACTION }],
    ["NoBillingLinkage managementAction", { ...neverSubscribedBody, managementAction: "NoBillingLinkage" }],
    ["different managementAction", { ...neverSubscribedBody, managementAction: "manage" }],
    ["missing managementAction", { organizationId: CONTROL_ORG, subscriptionState: null, billingLinked: false }],
  ];
  for (const [name, body] of variants) {
    assertEquals(isControlNeverSubscribedBody(body, CONTROL_ORG), false, name);
    const fetch: ControlFetch = async () => ({ ok: true, status: 200, body });
    assertEquals(
      await readControlCheckoutEntitlement({
        accessToken: "hub-session",
        controlOrganizationId: CONTROL_ORG,
        controlFetch: fetch,
      }),
      { ok: false },
      name,
    );
  }
});

Deno.test("readControlCheckoutEntitlement returns the Control state and recoveryAction", async () => {
  const calls: ControlCall[] = [];
  const fetch: ControlFetch = async (call, token) => {
    calls.push(call);
    assertEquals(token, "hub-session");
    return {
      ok: true,
      status: 200,
      body: withForwardRecoveryAction(controlHostedSubscriptionBody("Suspended"), "Subscribe"),
    };
  };
  assertEquals(
    await readControlCheckoutEntitlement({
      accessToken: "hub-session",
      controlOrganizationId: CONTROL_ORG,
      controlFetch: fetch,
    }),
    { ok: true, subscriptionState: "Suspended", recoveryAction: "Subscribe" },
  );
  assertEquals(calls[0].path, `/api/organizations/${CONTROL_ORG}/billing/hosted-subscription`);
});
