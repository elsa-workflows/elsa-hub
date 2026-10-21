import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { dispatchStripeWebhookEvent, type HubWebhookHandlers } from "./dispatch.ts";
import {
  captureConsoleError,
  type FakeCheckoutSession,
  fakeStripe,
  minutesFromNow,
} from "../_shared/cloud-billing_test_support.ts";
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

const CLOUD = { kind: "cloud", product_type: "cloud" };
const openSession = (id: string, metadata: Record<string, string>): FakeCheckoutSession => ({
  id,
  status: "open",
  url: `https://checkout.example/${id}`,
  expires_at: minutesFromNow(30),
  metadata,
});

function completedCloudCheckout(
  options: Parameters<typeof fakeStripe>[1] = {},
  customer: unknown = "cus_org_a",
) {
  const ran: string[] = [];
  const { stripe, calls } = fakeStripe([], options);
  const run = () =>
    dispatchStripeWebhookEvent(
      {
        type: "checkout.session.completed",
        data: { object: { id: "cs_paid", status: "complete", customer, metadata: CLOUD } },
      },
      { supabase: {}, stripe, hub: silentHub(ran) },
    );
  return { run, calls, ran };
}

Deno.test("a completed Cloud checkout expires the customer's other open Cloud checkouts only", async () => {
  const { run, calls, ran } = completedCloudCheckout({
    checkoutSessions: [
      openSession("cs_cloud_tab", CLOUD),
      openSession("cs_hub", { bundle_id: "b1" }),
      openSession("cs_academy", { kind: "academy" }),
      openSession("cs_cloud_admin", { ...CLOUD, hub_user_id: "admin-2" }),
    ],
  });

  assertEquals(await run(), "cloud");

  assertEquals(calls.sessionLists, [{ customer: "cus_org_a", status: "open", limit: 100 }]);
  assertEquals(calls.expired, ["cs_cloud_tab", "cs_cloud_admin"]);
  assertEquals(ran, []);
});

Deno.test("a completed Cloud checkout with no other open checkouts expires nothing", async () => {
  const { run, calls } = completedCloudCheckout({ checkoutSessions: [openSession("cs_hub", { bundle_id: "b1" })] });

  assertEquals(await run(), "cloud");

  assertEquals(calls.sessionLists.length, 1);
  assertEquals(calls.expired, []);
});

Deno.test("an expanded customer on the completed Cloud checkout is read by id", async () => {
  const { run, calls } = completedCloudCheckout({}, { id: "cus_expanded" });

  await run();

  assertEquals(calls.sessionLists, [{ customer: "cus_expanded", status: "open", limit: 100 }]);
});

Deno.test("a completed Cloud checkout without a customer lists nothing", async () => {
  const { run, calls } = completedCloudCheckout({}, null);

  assertEquals(await run(), "cloud");

  assertEquals(calls.sessionLists, []);
});

const cleanupFailures: Array<[string, Parameters<typeof fakeStripe>[1], string]> = [
  ["an expire failure", { checkoutSessions: [openSession("cs_cloud_tab", CLOUD)], expireError: new Error("already expired") }, "already expired"],
  ["a list failure", { sessionListError: new Error("stripe list down") }, "stripe list down"],
];
for (const [name, options, detail] of cleanupFailures) {
  Deno.test(`${name} after a completed Cloud checkout is logged and the event still succeeds`, async () => {
    const { run } = completedCloudCheckout(options);

    const { result, logged } = await captureConsoleError(run);

    assertEquals(result, "cloud");
    assertStringIncludes(logged, detail);
  });
}

Deno.test("other Cloud events leave open checkouts alone", async () => {
  const { stripe, calls } = fakeStripe([], { checkoutSessions: [openSession("cs_cloud_tab", CLOUD)] });

  for (const type of ["checkout.session.expired", "customer.subscription.updated", "invoice.paid"]) {
    await dispatchStripeWebhookEvent(
      { type, data: { object: { id: "obj", customer: "cus_org_a", metadata: CLOUD } } },
      { supabase: {}, stripe, hub: silentHub([]) },
    );
  }

  assertEquals(calls.sessionLists, []);
  assertEquals(calls.expired, []);
});
