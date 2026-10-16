/**
 * Deno tests for the Cloud billing adapter.
 * Run with: deno test --allow-read --allow-env supabase/functions/_shared/cloud-billing.test.ts
 *
 * Vitest also covers the same contract via src/lib/cloud/billingContract.test.ts.
 */
import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assertStripeTestMode,
  billingAccountFromControlLink,
  classifyStripeEvent,
  cloudBillingCustomerOwner,
  controlOrganizationIdFromLink,
  isCloudCheckoutRequest,
  isCloudStripeEvent,
  orgHasBlockingCloudSubscription,
  readStoredStripeCustomerId,
  readValidatedControlOrganizationId,
  requireCloudOrganizationId,
  selectLinkedHubOrganization,
  stripeWebhookRoute,
  unlinkedControlOrganizationError,
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

Deno.test("Control organization id comes from a validated link row, not the Hub org id", async () => {
  assertEquals(
    controlOrganizationIdFromLink({
      control_organization_id: "ctrl-org-1",
      validated_at: "2026-10-16T00:00:00.000Z",
    }),
    "ctrl-org-1",
  );
  assertEquals(
    controlOrganizationIdFromLink({
      control_organization_id: "ctrl-org-1",
      validated_at: null,
    }),
    null,
  );
  assertEquals(controlOrganizationIdFromLink(null), null);
  assertEquals(billingAccountFromControlLink("ctrl-org-1"), "linked");
  assertEquals(billingAccountFromControlLink(null), "missing");
  assertEquals(unlinkedControlOrganizationError().status, 403);
  assertEquals(unlinkedControlOrganizationError().code, "cloud_org_not_linked");
  assertEquals(await readValidatedControlOrganizationId({}, "hub-org-1"), null);
});

Deno.test("linked Hub org is the membership row, not a client foreign id", () => {
  const linked = selectLinkedHubOrganization(
    [{ organization_id: "org-b", role: "admin" }],
    "org-foreign",
  );
  assertEquals("organizationId" in linked, false);
  if ("error" in linked) {
    assertEquals(linked.status, 403);
    assertEquals(linked.code, "cloud_org_not_linked");
  }

  const missing = selectLinkedHubOrganization([], "org-b");
  assertEquals("organizationId" in missing, false);
  if ("error" in missing) {
    assertEquals(missing.status, 403);
    assertEquals(missing.code, "cloud_org_not_linked");
  }

  const matched = selectLinkedHubOrganization(
    [{ organization_id: "org-b", role: "admin" }],
    "org-b",
  );
  assertEquals(matched, { organizationId: "org-b" });
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

Deno.test("classifier still maps Cloud, Academy, and Hub billing_type events", () => {
  assertEquals(
    stripeWebhookRoute({
      type: "customer.subscription.updated",
      data: { object: { metadata: { kind: "cloud", product_type: "cloud" } } },
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
});

Deno.test("an active Cloud subscription blocks a second checkout; Hub and canceled Cloud do not", () => {
  assertEquals(
    orgHasBlockingCloudSubscription([
      { status: "active", metadata: { kind: "cloud", product_type: "cloud" } },
    ]),
    true,
  );
  assertEquals(
    orgHasBlockingCloudSubscription([
      { status: "trialing", metadata: { kind: "cloud" } },
    ]),
    true,
  );
  assertEquals(
    orgHasBlockingCloudSubscription([
      { status: "canceled", metadata: { kind: "cloud" } },
    ]),
    false,
  );
  assertEquals(
    orgHasBlockingCloudSubscription([
      { status: "active", metadata: { billing_type: "recurring" } },
    ]),
    false,
  );
});

Deno.test("stored customer ref read errors throw instead of returning missing", async () => {
  const failing = {
    from() {
      const query = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        maybeSingle() {
          return Promise.resolve({
            data: null,
            error: { message: "connection refused" },
          });
        },
      };
      return query;
    },
  };

  await assertRejects(
    () => readStoredStripeCustomerId(failing, { orgId: "org-b" }),
    Error,
    "Failed to read stored Stripe customer",
  );
});
