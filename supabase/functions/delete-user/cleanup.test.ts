import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  cleanupStripeCustomersForUserDelete,
  StripeCustomerDeleteError,
} from "./cleanup.ts";
import {
  createSupabaseStripeRefStore,
  livemodeFromStripeSecretKey,
  type StripeRefClient,
} from "./stripe_customer_refs.ts";

type Row = Record<string, unknown>;

const USER_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_USER_ID = "00000000-0000-4000-8000-000000000002";
const ORG_ID = "00000000-0000-4000-8000-0000000000aa";
const TEST_CUSTOMER = "cus_test_user_ref";
const LIVE_CUSTOMER = "cus_live_user_ref";
const ORG_CUSTOMER = "cus_test_org_ref";
const TEST_SECRET = "sk_test_placeholder";

type Tables = {
  organization_members: Row[];
  subscriptions: Row[];
  user_stripe_customers: Row[];
  org_stripe_customers: Row[];
};

function createMemoryClient(tables: Tables) {
  const from = (table: string) => {
    const predicates: Array<(row: Row) => boolean> = [];
    let mode: "select" | "delete" = "select";
    let wantSingle = false;

    const matched = () =>
      (tables[table as keyof Tables] ?? []).filter((row) =>
        predicates.every((predicate) => predicate(row))
      );

    const result = () => {
      if (mode === "delete") {
        const removing = new Set(matched());
        const current = tables[table as keyof Tables] ?? [];
        (tables as Record<string, Row[]>)[table] = current.filter(
          (row) => !removing.has(row),
        );
        return { data: null, error: null };
      }
      const data = matched();
      if (wantSingle) {
        return { data: data[0] ?? null, error: null };
      }
      return { data, error: null };
    };

    const api: Record<string, unknown> = {
      select() {
        return api;
      },
      delete() {
        mode = "delete";
        return api;
      },
      eq(column: string, value: unknown) {
        predicates.push((row) => row[column] === value);
        return api;
      },
      neq(column: string, value: unknown) {
        predicates.push((row) => row[column] !== value);
        return api;
      },
      in(column: string, values: unknown[]) {
        const allowed = new Set(values);
        predicates.push((row) => allowed.has(row[column]));
        return api;
      },
      maybeSingle() {
        wantSingle = true;
        return Promise.resolve(result());
      },
      then(
        onFulfilled: (value: unknown) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
        return Promise.resolve(result()).then(onFulfilled, onRejected);
      },
    };

    return api;
  };

  return { from, tables };
}

function createStripeMock(options?: {
  onDelete?: (customerId: string) => Promise<void> | void;
}) {
  const deleted: string[] = [];
  const canceled: string[] = [];
  const stripe = {
    customers: {
      del: async (customerId: string) => {
        if (options?.onDelete) {
          await options.onDelete(customerId);
        }
        deleted.push(customerId);
        return { id: customerId, deleted: true };
      },
    },
    subscriptions: {
      cancel: async (subscriptionId: string) => {
        canceled.push(subscriptionId);
        return { id: subscriptionId, status: "canceled" };
      },
    },
  };
  return { stripe, deleted, canceled };
}

function emptyTables(): Tables {
  return {
    organization_members: [],
    subscriptions: [],
    user_stripe_customers: [],
    org_stripe_customers: [],
  };
}

Deno.test("user ref present: deletes stored customer and clears that livemode row", async () => {
  const livemode = livemodeFromStripeSecretKey(TEST_SECRET);
  assertEquals(livemode, false);

  const client = createMemoryClient({
    ...emptyTables(),
    user_stripe_customers: [
      { user_id: USER_ID, stripe_customer_id: TEST_CUSTOMER, livemode: false },
      { user_id: USER_ID, stripe_customer_id: LIVE_CUSTOMER, livemode: true },
    ],
  });
  const { stripe, deleted } = createStripeMock();
  const refs = createSupabaseStripeRefStore(client as unknown as StripeRefClient);

  const { warnings } = await cleanupStripeCustomersForUserDelete({
    serviceClient: client as never,
    stripe,
    refs,
    userId: USER_ID,
    livemode,
  });

  assertEquals(warnings, []);
  assertEquals(deleted, [TEST_CUSTOMER]);
  assertEquals(client.tables.user_stripe_customers, [
    { user_id: USER_ID, stripe_customer_id: LIVE_CUSTOMER, livemode: true },
  ]);
});

Deno.test("user ref absent: makes no Stripe customer call", async () => {
  const livemode = livemodeFromStripeSecretKey(TEST_SECRET);
  const client = createMemoryClient({
    ...emptyTables(),
    user_stripe_customers: [
      { user_id: USER_ID, stripe_customer_id: LIVE_CUSTOMER, livemode: true },
    ],
  });
  const { stripe, deleted } = createStripeMock();
  const refs = createSupabaseStripeRefStore(client as unknown as StripeRefClient);

  await cleanupStripeCustomersForUserDelete({
    serviceClient: client as never,
    stripe,
    refs,
    userId: USER_ID,
    livemode,
  });

  assertEquals(deleted, []);
  assertEquals(client.tables.user_stripe_customers.length, 1);
});

Deno.test("org removed with a ref: last owner deletes the org customer and clears the ref", async () => {
  const livemode = livemodeFromStripeSecretKey(TEST_SECRET);
  const client = createMemoryClient({
    ...emptyTables(),
    organization_members: [
      { organization_id: ORG_ID, user_id: USER_ID, role: "owner" },
    ],
    org_stripe_customers: [
      {
        organization_id: ORG_ID,
        stripe_customer_id: ORG_CUSTOMER,
        livemode: false,
      },
    ],
  });
  const { stripe, deleted } = createStripeMock();
  const refs = createSupabaseStripeRefStore(client as unknown as StripeRefClient);

  await cleanupStripeCustomersForUserDelete({
    serviceClient: client as never,
    stripe,
    refs,
    userId: USER_ID,
    livemode,
  });

  assertEquals(deleted, [ORG_CUSTOMER]);
  assertEquals(client.tables.org_stripe_customers, []);
});

Deno.test("org kept because other admins remain: org customer is not deleted", async () => {
  const livemode = livemodeFromStripeSecretKey(TEST_SECRET);
  const client = createMemoryClient({
    ...emptyTables(),
    organization_members: [
      { organization_id: ORG_ID, user_id: USER_ID, role: "owner" },
      { organization_id: ORG_ID, user_id: OTHER_USER_ID, role: "owner" },
    ],
    org_stripe_customers: [
      {
        organization_id: ORG_ID,
        stripe_customer_id: ORG_CUSTOMER,
        livemode: false,
      },
    ],
  });
  const { stripe, deleted } = createStripeMock();
  const refs = createSupabaseStripeRefStore(client as unknown as StripeRefClient);

  await cleanupStripeCustomersForUserDelete({
    serviceClient: client as never,
    stripe,
    refs,
    userId: USER_ID,
    livemode,
  });

  assertEquals(deleted, []);
  assertEquals(client.tables.org_stripe_customers, [
    {
      organization_id: ORG_ID,
      stripe_customer_id: ORG_CUSTOMER,
      livemode: false,
    },
  ]);
});

Deno.test("Stripe 404 resource_missing: clears the stored ref", async () => {
  const livemode = livemodeFromStripeSecretKey(TEST_SECRET);
  const client = createMemoryClient({
    ...emptyTables(),
    user_stripe_customers: [
      { user_id: USER_ID, stripe_customer_id: TEST_CUSTOMER, livemode: false },
    ],
  });
  const { stripe } = createStripeMock({
    onDelete: () => {
      throw { code: "resource_missing", statusCode: 404 };
    },
  });
  const refs = createSupabaseStripeRefStore(client as unknown as StripeRefClient);

  await cleanupStripeCustomersForUserDelete({
    serviceClient: client as never,
    stripe,
    refs,
    userId: USER_ID,
    livemode,
  });

  assertEquals(client.tables.user_stripe_customers, []);
});

Deno.test("Stripe error: keeps the ref and surfaces the error", async () => {
  const livemode = livemodeFromStripeSecretKey(TEST_SECRET);
  const client = createMemoryClient({
    ...emptyTables(),
    user_stripe_customers: [
      { user_id: USER_ID, stripe_customer_id: TEST_CUSTOMER, livemode: false },
    ],
  });
  const { stripe, deleted } = createStripeMock({
    onDelete: () => {
      throw { code: "rate_limit", statusCode: 429, message: "Too many requests" };
    },
  });
  const refs = createSupabaseStripeRefStore(client as unknown as StripeRefClient);

  const err = await assertRejects(
    () =>
      cleanupStripeCustomersForUserDelete({
        serviceClient: client as never,
        stripe,
        refs,
        userId: USER_ID,
        livemode,
      }),
    StripeCustomerDeleteError,
  );

  assertEquals(deleted, []);
  assertEquals(client.tables.user_stripe_customers, [
    { user_id: USER_ID, stripe_customer_id: TEST_CUSTOMER, livemode: false },
  ]);
  assertEquals(err.customerId, TEST_CUSTOMER);
  assertEquals(
    err.message.includes("Stripe customer delete failed for cus_test_user_ref"),
    true,
  );
});
