/**
 * Deno tests for the Cloud billing adapter.
 * Run with: deno test --allow-read --allow-env supabase/functions/_shared/cloud-billing.test.ts
 *
 * Vitest also covers the same contract via src/lib/cloud/billingContract.test.ts.
 */
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assertStripeTestMode,
  classifyStripeEvent,
  cloudBillingCustomerOwner,
  controlOrganizationIdFromHubOrg,
  isCloudCheckoutRequest,
  isCloudStripeEvent,
  readStoredStripeCustomerId,
  requireCloudOrganizationId,
  resolveControlOrganizationId,
  stripeWebhookRoute,
} from "./cloud-billing.ts";

type StoredRow = {
  ownerId: string;
  stripeCustomerId: string;
};

function createMockStore(seed?: { org?: StoredRow[]; user?: StoredRow[] }) {
  const orgRows: StoredRow[] = [...(seed?.org ?? [])];
  const userRows: StoredRow[] = [...(seed?.user ?? [])];

  return {
    orgRows,
    userRows,
    listedByEmail: 0,
    from(table: string) {
      let selectedOwner: string | undefined;
      const rows = table === "org_stripe_customers" ? orgRows : userRows;
      const ownerKey = table === "org_stripe_customers" ? "organization_id" : "user_id";
      const query = {
        select(_columns: string) {
          return query;
        },
        eq(column: string, value: string) {
          if (column === ownerKey) selectedOwner = value;
          return query;
        },
        maybeSingle() {
          const found = rows.find((row) => row.ownerId === selectedOwner);
          return Promise.resolve({
            data: found ? { stripe_customer_id: found.stripeCustomerId } : null,
            error: null,
          });
        },
      };
      return query;
    },
  };
}

Deno.test("Cloud checkout body is recognized", () => {
  assertEquals(isCloudCheckoutRequest({ productType: "cloud" }), true);
  assertEquals(isCloudCheckoutRequest({ bundleId: "b1" }), false);
});

Deno.test("personal Cloud checkout is rejected", () => {
  let threw = false;
  try {
    requireCloudOrganizationId(undefined);
  } catch (error) {
    threw = error instanceof Error && error.message.includes("requires an organization");
  }
  assertEquals(threw, true);
});

Deno.test("client-supplied Control organization id is ignored", () => {
  assertEquals(
    controlOrganizationIdFromHubOrg("hub-org-1", "attacker-control-org"),
    "hub-org-1",
  );
  assertEquals(
    resolveControlOrganizationId({
      hubOrganizationId: "hub-org-1",
      controlOrganizationId: "attacker-control-org",
    }),
    "hub-org-1",
  );
});

Deno.test("org B never resolves to org A's customer or the admin's personal customer", async () => {
  const supabase = createMockStore({
    org: [
      { ownerId: "org-a", stripeCustomerId: "cus_org_a" },
      { ownerId: "org-b", stripeCustomerId: "cus_org_b" },
    ],
    user: [
      { ownerId: "admin-1", stripeCustomerId: "cus_admin_personal" },
    ],
  });

  const orgBOwner = cloudBillingCustomerOwner({
    organizationId: "org-b",
    userId: "admin-1",
  });
  const orgAOwner = cloudBillingCustomerOwner({
    organizationId: "org-a",
    userId: "admin-1",
  });
  const personalOwner = cloudBillingCustomerOwner({
    userId: "admin-1",
  });

  assertEquals(orgBOwner, { orgId: "org-b" });
  assertEquals(personalOwner, { userId: "admin-1" });

  const orgB = await readStoredStripeCustomerId(supabase, orgBOwner);
  const orgA = await readStoredStripeCustomerId(supabase, orgAOwner);
  const personal = await readStoredStripeCustomerId(supabase, personalOwner);

  assertEquals(orgB, "cus_org_b");
  assertEquals(orgA, "cus_org_a");
  assertEquals(personal, "cus_admin_personal");
  assertEquals(orgB === orgA, false);
  assertEquals(orgB === personal, false);
});

Deno.test("personal portal owner is the caller's user row, not any org customer", async () => {
  const supabase = createMockStore({
    org: [{ ownerId: "org-a", stripeCustomerId: "cus_org_a" }],
    user: [{ ownerId: "user-1", stripeCustomerId: "cus_user_1" }],
  });

  const owner = cloudBillingCustomerOwner({ userId: "user-1" });
  assertEquals(owner, { userId: "user-1" });
  assertEquals(await readStoredStripeCustomerId(supabase, owner), "cus_user_1");
});

Deno.test("sandbox allow-lists test keys and rejects live keys", () => {
  assertStripeTestMode("sk_test_cloud");
  assertStripeTestMode("rk_test_cloud");

  let liveSecret = false;
  try {
    assertStripeTestMode("sk_live_cloud");
  } catch {
    liveSecret = true;
  }
  let liveRestricted = false;
  try {
    assertStripeTestMode("rk_live_cloud");
  } catch {
    liveRestricted = true;
  }
  assertEquals(liveSecret, true);
  assertEquals(liveRestricted, true);
});

Deno.test("Cloud events skip Hub orders; Academy events skip Cloud", () => {
  assertEquals(
    isCloudStripeEvent({
      data: { object: { metadata: { kind: "cloud" } } },
    }),
    true,
  );
  assertEquals(
    classifyStripeEvent({
      data: { object: { metadata: { kind: "academy" } } },
    }),
    "academy",
  );
  assertEquals(
    isCloudStripeEvent({
      data: { object: { metadata: { kind: "academy" } } },
    }),
    false,
  );
});

Deno.test("Cloud checkout, portal, and status never list Stripe customers by email", () => {
  const checkout = Deno.readTextFileSync(new URL("../create-checkout-session/cloud.ts", import.meta.url));
  const portal = Deno.readTextFileSync(new URL("../customer-portal/cloud.ts", import.meta.url));
  const status = Deno.readTextFileSync(new URL("../cloud-billing/index.ts", import.meta.url));
  const helper = Deno.readTextFileSync(new URL("./stripe-customer.ts", import.meta.url));

  assertEquals(checkout.includes("customers.list("), false);
  assertEquals(portal.includes("customers.list("), false);
  assertEquals(status.includes("customers.list("), false);
  assertEquals(helper.includes("customers.list"), false);
  assertEquals(checkout.includes("getOrCreateStripeCustomer"), true);
  assertEquals(portal.includes("readStoredStripeCustomerId"), true);
  assertEquals(status.includes("readStoredStripeCustomerId"), true);
});

Deno.test("webhook routing order: Cloud early, then academy, then billing_type", () => {
  assertEquals(
    stripeWebhookRoute({
      type: "checkout.session.completed",
      data: { object: { metadata: { kind: "cloud" } } },
    }),
    "cloud",
  );
  assertEquals(
    stripeWebhookRoute({
      type: "checkout.session.completed",
      data: { object: { metadata: { kind: "academy" } } },
    }),
    "academy",
  );
  assertEquals(
    stripeWebhookRoute({
      type: "checkout.session.completed",
      data: { object: { metadata: { billing_type: "recurring" } } },
    }),
    "hub",
  );

  const webhook = Deno.readTextFileSync(
    new URL("../stripe-webhook/index.ts", import.meta.url),
  );
  const cloudIdx = webhook.indexOf("isCloudStripeEvent(event)");
  const academyIdx = webhook.indexOf('session.metadata?.kind === "academy"');
  const billingIdx = webhook.indexOf("session.metadata?.billing_type");
  assertEquals(cloudIdx > -1, true);
  assertEquals(academyIdx > -1, true);
  assertEquals(billingIdx > -1, true);
  assertEquals(cloudIdx < academyIdx, true);
  assertEquals(academyIdx < billingIdx, true);
});
