/**
 * Deno tests for the Cloud billing adapter.
 * Run with: deno test --allow-env supabase/functions/_shared/cloud-billing.test.ts
 *
 * Vitest also covers the same contract via src/lib/cloud/billingContract.test.ts.
 */
import { assertEquals } from "https://deno.land/std@0.190.0/assert/mod.ts";
import {
  classifyStripeEvent,
  isCloudCheckoutRequest,
  isCloudStripeEvent,
} from "./cloud-billing.ts";

Deno.test("Cloud checkout body is recognized", () => {
  assertEquals(isCloudCheckoutRequest({ productType: "cloud" }), true);
  assertEquals(isCloudCheckoutRequest({ bundleId: "b1" }), false);
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
