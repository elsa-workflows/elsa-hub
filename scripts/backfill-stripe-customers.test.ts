import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assertApplyAllowed,
  assertFixtureNotUsedForApply,
  formatBackfillPlan,
  loadBackfillFixture,
  planStripeCustomerBackfill,
} from "./backfill-stripe-customers.ts";

const fixture = loadBackfillFixture();

Deno.test("dry-run fixture matches one org, one user, and does not share a customer", () => {
  const plan = planStripeCustomerBackfill(fixture, true);
  assertEquals(plan.counts.orgs_scanned, 2);
  assertEquals(plan.counts.orgs_matched, 2);
  assertEquals(plan.counts.orgs_would_write, 2);
  assertEquals(plan.counts.orgs_skipped_shared, 0);
  assertEquals(plan.counts.users_matched, 1);
  assertEquals(plan.counts.users_would_write, 1);
  assertEquals(plan.orgWrites[0].stripe_customer_id, "cus_test_org_a");
  assertEquals(plan.orgWrites[1].stripe_customer_id, "cus_test_org_b");
  assertEquals(plan.userWrites[0].stripe_customer_id, "cus_test_user_a");
  assertEquals(new Set(plan.orgWrites.map((row) => row.stripe_customer_id)).size, 2);
  assertEquals(plan.orgWrites[0].livemode, false);
  assertEquals(plan.orgWrites[0].email_masked, "b***@example.test");
  const printed = formatBackfillPlan(plan);
  assertEquals(printed.includes("buyer@example.test"), false);
  assertEquals(printed.includes("b***@example.test"), true);
});

Deno.test("user match skips Stripe customers that already have organization_id", () => {
  const plan = planStripeCustomerBackfill({
    livemode: false,
    organizations: [],
    users: [{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", email: "buyer@example.test" }],
    subscriptions: [],
    existingOrgRefs: [],
    existingUserRefs: [],
    stripeCustomers: [
      {
        id: "cus_test_org_a",
        email: "buyer@example.test",
        metadata: {
          organization_id: "11111111-1111-4111-8111-111111111111",
          user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        },
      },
      {
        id: "cus_test_user_a",
        email: "buyer@example.test",
        metadata: { user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
      },
    ],
  }, true);
  assertEquals(plan.userWrites.length, 1);
  assertEquals(plan.userWrites[0].stripe_customer_id, "cus_test_user_a");
});

Deno.test("--apply refuses without a test key or --live", () => {
  assertThrows(
    () => assertApplyAllowed({ apply: true, live: false, stripeSecretKey: "rk_live_example" }),
    Error,
    "sk_test_",
  );
  assertApplyAllowed({ apply: true, live: false, stripeSecretKey: "sk_test_example" });
  assertApplyAllowed({ apply: false, live: false, stripeSecretKey: "" });
});

Deno.test("--apply cannot use a fixture", () => {
  assertThrows(
    () => assertFixtureNotUsedForApply(true, true),
    Error,
    "fixtures are for tests only",
  );
  assertFixtureNotUsedForApply(false, true);
  assertFixtureNotUsedForApply(true, false);
});
