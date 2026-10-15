import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { dispatchStripeWebhookEvent, type HubWebhookHandlers } from "./dispatch.ts";
import {
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
          rows.push({ ...row, revoked_at: null });
          return { error: null };
        },
        update: (values: { revoked_at: string }) => ({
          eq: () => ({
            is: async () => {
              for (const row of rows) row.revoked_at = values.revoked_at;
              return { error: null };
            },
          }),
        }),
      };
    },
  };
  return { rows, client };
}

function silentHub(ran: string[]): HubWebhookHandlers {
  const mark = async (name: string) => {
    ran.push(name);
  };
  return {
    onCheckoutCompleted: async () => {
      await mark("hub");
    },
    onCheckoutExpired: async () => {
      await mark("hub");
    },
    onInvoicePaid: async () => {
      await mark("hub");
    },
    onSubscriptionUpdated: async () => {
      await mark("hub");
    },
    onSubscriptionDeleted: async () => {
      await mark("hub");
    },
    onChargeRefunded: async () => {
      await mark("hub");
    },
  };
}

const ACADEMY_SESSION: AcademySession = {
  id: "cs_test_solo",
  payment_status: "paid",
  metadata: {
    kind: "academy",
    product_code: "solo_bundle",
    user_id: "00000000-0000-4000-8000-000000000002",
    seats: "1",
  },
};

Deno.test("dispatches Cloud, Academy, and Hub events to the matching handlers", async () => {
  const store = createEntitlementStore();
  const ran: string[] = [];
  const hub = silentHub(ran);

  const cloudKind = await dispatchStripeWebhookEvent(
    {
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_cloud",
          status: "active",
          metadata: { kind: "cloud", product_type: "cloud" },
        },
      },
    },
    { supabase: store.client, stripe: {}, hub },
  );
  assertEquals(cloudKind, "cloud");
  assertEquals(ran, []);
  assertEquals(store.rows.length, 0);

  const academyKind = await dispatchStripeWebhookEvent(
    {
      type: "checkout.session.completed",
      data: { object: ACADEMY_SESSION },
    },
    { supabase: store.client, stripe: {}, hub },
  );
  assertEquals(academyKind, "academy");
  assertEquals(ran, []);
  assertEquals(store.rows.length, 1);
  assertEquals(store.rows[0].product_code, "solo_bundle");
  assertEquals(store.rows[0].subject_type, "user");
  assertEquals(store.rows[0].stripe_checkout_session_id, "cs_test_solo");
  assertEquals(store.rows[0].user_id, ACADEMY_SESSION.metadata!.user_id);
  assertEquals(store.rows[0].seats, 1);

  const hubKind = await dispatchStripeWebhookEvent(
    {
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_hub",
          metadata: { billing_type: "recurring", bundle_id: "b1" },
        },
      },
    },
    { supabase: store.client, stripe: {}, hub },
  );
  assertEquals(hubKind, "hub");
  assertEquals(ran, ["hub"]);
  assertEquals(store.rows.length, 1);
});
