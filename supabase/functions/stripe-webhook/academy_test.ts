import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import {
  handleAcademyAsyncPaymentFailed,
  handleAcademyCheckout,
  handleAcademyRefund,
  isAcademySession,
  type AcademyEntitlementRow,
  type AcademySession,
} from "./academy.ts";

type StoredEntitlement = AcademyEntitlementRow & { revoked_at?: string | null };

function createEntitlementStore() {
  const rows: StoredEntitlement[] = [];

  const client = {
    from: (table: string) => {
      assertEquals(table, "academy_entitlements");
      return {
        insert: async (row: AcademyEntitlementRow) => {
          const conflict = rows.some((existing) =>
            existing.stripe_checkout_session_id === row.stripe_checkout_session_id
          );
          if (conflict) {
            return { error: { code: "23505", message: "duplicate key" } };
          }
          rows.push({ ...row, revoked_at: null });
          return { error: null };
        },
        update: (values: { revoked_at: string }) => ({
          eq: (column: string, value: string) => ({
            is: async (nullColumn: string, nullValue: null) => {
              for (const row of rows) {
                const matchesEq = (row as Record<string, unknown>)[column] === value;
                const matchesNull = (row as Record<string, unknown>)[nullColumn] == nullValue;
                if (matchesEq && matchesNull) {
                  row.revoked_at = values.revoked_at;
                }
              }
              return { error: null };
            },
          }),
        }),
      };
    },
  };

  return { rows, client };
}

const SOLO_SESSION: AcademySession = {
  id: "cs_test_solo",
  payment_status: "paid",
  metadata: {
    kind: "academy",
    product_code: "solo_bundle",
    course_id: "00000000-0000-4000-8000-000000002001",
    user_id: "00000000-0000-4000-8000-000000000002",
    seats: "1",
  },
};

const TEAM_SESSION: AcademySession = {
  id: "cs_test_team10",
  payment_status: "paid",
  metadata: {
    kind: "academy",
    product_code: "team_10",
    course_id: "00000000-0000-4000-8000-000000002010",
    user_id: "00000000-0000-4000-8000-000000000002",
    organization_id: "00000000-0000-4000-8000-000000001001",
    seats: "10",
  },
};

const SUPPORT_HOURS_SESSION: AcademySession = {
  id: "cs_test_hours",
  payment_status: "paid",
  metadata: {
    billing_type: "one_time",
    order_id: "order-1",
  },
};

Deno.test("AC3 non-academy session is left untouched", async () => {
  const store = createEntitlementStore();
  assertEquals(isAcademySession(SUPPORT_HOURS_SESSION), false);
  const result = await handleAcademyCheckout(store.client, SUPPORT_HOURS_SESSION);
  assertEquals(result.handled, false);
  assertEquals(result.reason, "not_academy");
  assertEquals(store.rows.length, 0);
});

Deno.test("AC4 webhook grants a Solo user entitlement", async () => {
  const store = createEntitlementStore();
  const result = await handleAcademyCheckout(store.client, SOLO_SESSION);
  assertEquals(result, { handled: true, reason: "granted" });
  assertEquals(store.rows.length, 1);
  assertEquals(store.rows[0].subject_type, "user");
  assertEquals(store.rows[0].user_id, SOLO_SESSION.metadata!.user_id);
  assertEquals(store.rows[0].organization_id, null);
  assertEquals(store.rows[0].seats, 1);
  assertEquals(store.rows[0].source, "stripe");
  assertEquals(store.rows[0].product_code, "solo_bundle");
  assertEquals(store.rows[0].course_id, null);
  assertEquals(store.rows[0].stripe_checkout_session_id, "cs_test_solo");
});

Deno.test("AC4 solo_bundle grant matches courses that list that SKU", async () => {
  const store = createEntitlementStore();
  await handleAcademyCheckout(store.client, SOLO_SESSION);
  const grant = store.rows[0];
  const publishedCourse = {
    id: "00000000-0000-4000-8000-000000002001",
    product_codes: ["solo_bundle", "team_5", "team_10"],
  };
  const unpublishedCourse = {
    id: "00000000-0000-4000-8000-000000002002",
    product_codes: ["team_5", "solo_bundle"],
  };
  assertEquals(grant.product_code, "solo_bundle");
  assertEquals(grant.course_id, null);
  assertEquals(publishedCourse.product_codes.includes(grant.product_code!), true);
  assertEquals(unpublishedCourse.product_codes.includes(grant.product_code!), true);
});

Deno.test("AC4 Team 5 purchase creates an org entitlement with 5 seats", async () => {
  const store = createEntitlementStore();
  const result = await handleAcademyCheckout(store.client, {
    id: "cs_test_team5",
    payment_status: "paid",
    metadata: {
      kind: "academy",
      product_code: "team_5",
      user_id: "00000000-0000-4000-8000-000000000002",
      organization_id: "00000000-0000-4000-8000-000000001001",
      seats: "5",
    },
  });
  assertEquals(result.reason, "granted");
  assertEquals(store.rows[0].subject_type, "org");
  assertEquals(store.rows[0].seats, 5);
  assertEquals(store.rows[0].user_id, null);
  assertEquals(store.rows[0].product_code, "team_5");
  assertEquals(store.rows[0].course_id, null);
});

Deno.test("AC4 Team purchase creates an org entitlement with 10 seats", async () => {
  const store = createEntitlementStore();
  const result = await handleAcademyCheckout(store.client, TEAM_SESSION);
  assertEquals(result.reason, "granted");
  assertEquals(store.rows[0].subject_type, "org");
  assertEquals(store.rows[0].user_id, null);
  assertEquals(store.rows[0].organization_id, TEAM_SESSION.metadata!.organization_id);
  assertEquals(store.rows[0].seats, 10);
  assertEquals(store.rows[0].product_code, "team_10");
  assertEquals(store.rows[0].course_id, null);
});

Deno.test("AC4 replay of the same checkout session inserts exactly one row", async () => {
  const store = createEntitlementStore();
  const first = await handleAcademyCheckout(store.client, SOLO_SESSION);
  const second = await handleAcademyCheckout(store.client, SOLO_SESSION);
  assertEquals(first.reason, "granted");
  assertEquals(second.reason, "replay");
  assertEquals(store.rows.length, 1);
});

function academyStripeFor(session: AcademySession, paymentIntent = "pi_test_solo") {
  return {
    checkout: {
      sessions: {
        list: async (params: { payment_intent: string }) => {
          assertEquals(params.payment_intent, paymentIntent);
          return { data: [session] };
        },
      },
    },
  };
}

Deno.test("AC5 full refund (charge.refunded === true) sets revoked_at", async () => {
  const store = createEntitlementStore();
  await handleAcademyCheckout(store.client, SOLO_SESSION);
  assertEquals(store.rows[0].revoked_at, null);

  const result = await handleAcademyRefund(store.client, academyStripeFor(SOLO_SESSION), {
    id: "ch_full",
    payment_intent: "pi_test_solo",
    refunded: true,
    amount: 2900,
    amount_refunded: 2900,
  });
  assertEquals(result, { handled: true, reason: "revoked" });
  assertEquals(typeof store.rows[0].revoked_at, "string");
});

Deno.test("AC5 full refund (amount_refunded >= amount) sets revoked_at", async () => {
  const store = createEntitlementStore();
  await handleAcademyCheckout(store.client, SOLO_SESSION);

  const result = await handleAcademyRefund(store.client, academyStripeFor(SOLO_SESSION), {
    id: "ch_full_amounts",
    payment_intent: "pi_test_solo",
    refunded: false,
    amount: 2900,
    amount_refunded: 2900,
  });
  assertEquals(result, { handled: true, reason: "revoked" });
  assertEquals(typeof store.rows[0].revoked_at, "string");
});

Deno.test("AC5 partial refund logs and leaves access in place", async () => {
  const store = createEntitlementStore();
  await handleAcademyCheckout(store.client, SOLO_SESSION);

  const result = await handleAcademyRefund(store.client, academyStripeFor(SOLO_SESSION), {
    id: "ch_partial",
    payment_intent: "pi_test_solo",
    refunded: false,
    amount: 2900,
    amount_refunded: 500,
  });
  assertEquals(result, { handled: true, reason: "partial_refund" });
  assertEquals(store.rows[0].revoked_at, null);
});

Deno.test("AC3/AC5 non-academy refund leaves academy rows untouched", async () => {
  const store = createEntitlementStore();
  await handleAcademyCheckout(store.client, SOLO_SESSION);

  const stripe = {
    checkout: {
      sessions: {
        list: async () => ({ data: [SUPPORT_HOURS_SESSION] }),
      },
    },
  };

  const result = await handleAcademyRefund(store.client, stripe, {
    id: "ch_hours",
    payment_intent: "pi_hours",
  });
  assertEquals(result.handled, false);
  assertEquals(result.reason, "not_academy");
  assertEquals(store.rows[0].revoked_at, null);
});

Deno.test("unpaid academy session does not grant an entitlement", async () => {
  const store = createEntitlementStore();
  const result = await handleAcademyCheckout(store.client, {
    ...SOLO_SESSION,
    payment_status: "unpaid",
  });
  assertEquals(result, { handled: true, reason: "unpaid" });
  assertEquals(store.rows.length, 0);
});

Deno.test("async_payment_succeeded grants the same idempotent Solo row", async () => {
  const store = createEntitlementStore();
  const first = await handleAcademyCheckout(store.client, {
    ...SOLO_SESSION,
    payment_status: "paid",
  });
  const second = await handleAcademyCheckout(store.client, {
    ...SOLO_SESSION,
    payment_status: "paid",
  });
  assertEquals(first.reason, "granted");
  assertEquals(second.reason, "replay");
  assertEquals(store.rows.length, 1);
});

Deno.test("async_payment_failed is a no-op with no grant", async () => {
  const store = createEntitlementStore();
  const result = handleAcademyAsyncPaymentFailed({
    ...SOLO_SESSION,
    payment_status: "unpaid",
  });
  assertEquals(result, { handled: true, reason: "async_failed" });
  assertEquals(store.rows.length, 0);
});

Deno.test("webhook ignores Solo metadata that is not 1 seat and user-only", async () => {
  const store = createEntitlementStore();
  const seats = await handleAcademyCheckout(store.client, {
    ...SOLO_SESSION,
    metadata: { ...SOLO_SESSION.metadata, seats: "5" },
  });
  const withOrg = await handleAcademyCheckout(store.client, {
    ...SOLO_SESSION,
    metadata: { ...SOLO_SESSION.metadata, organization_id: "org-1" },
  });
  assertEquals(seats.reason, "seats_mismatch");
  assertEquals(withOrg.reason, "org_on_solo");
  assertEquals(store.rows.length, 0);
});

Deno.test("webhook ignores Team metadata that is not 5 or 10 seats with an org", async () => {
  const store = createEntitlementStore();
  const noOrg = await handleAcademyCheckout(store.client, {
    ...TEAM_SESSION,
    metadata: { ...TEAM_SESSION.metadata, organization_id: undefined, seats: "10" },
  });
  const badSeats = await handleAcademyCheckout(store.client, {
    ...TEAM_SESSION,
    metadata: { ...TEAM_SESSION.metadata, seats: "1" },
  });
  const unknown = await handleAcademyCheckout(store.client, {
    ...TEAM_SESSION,
    metadata: { ...TEAM_SESSION.metadata, product_code: "anything_at_all" },
  });
  assertEquals(noOrg.reason, "missing_org");
  assertEquals(badSeats.reason, "seats_mismatch");
  assertEquals(unknown.reason, "unknown_sku");
  assertEquals(store.rows.length, 0);
});
