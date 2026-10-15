import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assertApplyAllowed,
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
