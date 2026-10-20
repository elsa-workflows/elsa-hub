import {
  assertEquals,
  assertRejects,
  assertThrows,
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
const LIVE_SECRET = "sk_live_placeholder";

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

Deno.test("org kept because another owner remains: org customer is not deleted", async () => {
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

function runCleanup(
  client: ReturnType<typeof createMemoryClient>,
  stripe: ReturnType<typeof createStripeMock>["stripe"],
  secret = TEST_SECRET,
) {
  return cleanupStripeCustomersForUserDelete({
    serviceClient: client as never,
    stripe,
    refs: createSupabaseStripeRefStore(client as unknown as StripeRefClient),
    userId: USER_ID,
    livemode: livemodeFromStripeSecretKey(secret),
  });
}

Deno.test("livemode follows the secret key prefix", () => {
  assertEquals(livemodeFromStripeSecretKey("sk_live_x"), true);
  assertEquals(livemodeFromStripeSecretKey("rk_live_x"), true);
  assertEquals(livemodeFromStripeSecretKey("sk_test_x"), false);
  assertEquals(livemodeFromStripeSecretKey("rk_test_x"), false);
  assertThrows(() => livemodeFromStripeSecretKey("whsec_x"));
});

Deno.test("live key deletes only the live ref and leaves the test ref", async () => {
  const client = createMemoryClient({
    ...emptyTables(),
    user_stripe_customers: [
      { user_id: USER_ID, stripe_customer_id: TEST_CUSTOMER, livemode: false },
      { user_id: USER_ID, stripe_customer_id: LIVE_CUSTOMER, livemode: true },
    ],
  });
  const { stripe, deleted } = createStripeMock();

  await runCleanup(client, stripe, LIVE_SECRET);

  assertEquals(deleted, [LIVE_CUSTOMER]);
  assertEquals(client.tables.user_stripe_customers, [
    { user_id: USER_ID, stripe_customer_id: TEST_CUSTOMER, livemode: false },
  ]);
});

Deno.test("only the deleted user's customer is touched, never another user's", async () => {
  const client = createMemoryClient({
    ...emptyTables(),
    user_stripe_customers: [
      { user_id: USER_ID, stripe_customer_id: TEST_CUSTOMER, livemode: false },
      { user_id: OTHER_USER_ID, stripe_customer_id: "cus_other", livemode: false },
    ],
  });
  const { stripe, deleted } = createStripeMock();

  await runCleanup(client, stripe);

  assertEquals(deleted, [TEST_CUSTOMER]);
  assertEquals(client.tables.user_stripe_customers, [
    { user_id: OTHER_USER_ID, stripe_customer_id: "cus_other", livemode: false },
  ]);
});

Deno.test("org with a non-owner admin left is still removed with the sole owner", async () => {
  const client = createMemoryClient({
    ...emptyTables(),
    organization_members: [
      { organization_id: ORG_ID, user_id: USER_ID, role: "owner" },
      { organization_id: ORG_ID, user_id: OTHER_USER_ID, role: "admin" },
    ],
    org_stripe_customers: [
      { organization_id: ORG_ID, stripe_customer_id: ORG_CUSTOMER, livemode: false },
    ],
  });
  const { stripe, deleted } = createStripeMock();

  await runCleanup(client, stripe);

  assertEquals(deleted, [ORG_CUSTOMER]);
  assertEquals(client.tables.org_stripe_customers, []);
});

Deno.test("org ref stays when the user is only a member or admin of it", async () => {
  const client = createMemoryClient({
    ...emptyTables(),
    organization_members: [
      { organization_id: ORG_ID, user_id: USER_ID, role: "admin" },
      { organization_id: ORG_ID, user_id: OTHER_USER_ID, role: "owner" },
    ],
    org_stripe_customers: [
      { organization_id: ORG_ID, stripe_customer_id: ORG_CUSTOMER, livemode: false },
    ],
  });
  const { stripe, deleted } = createStripeMock();

  await runCleanup(client, stripe);

  assertEquals(deleted, []);
  assertEquals(client.tables.org_stripe_customers.length, 1);
});

Deno.test("org Stripe 404: clears the org ref and still deletes the user customer", async () => {
  const client = createMemoryClient({
    ...emptyTables(),
    organization_members: [
      { organization_id: ORG_ID, user_id: USER_ID, role: "owner" },
    ],
    org_stripe_customers: [
      { organization_id: ORG_ID, stripe_customer_id: ORG_CUSTOMER, livemode: false },
    ],
    user_stripe_customers: [
      { user_id: USER_ID, stripe_customer_id: TEST_CUSTOMER, livemode: false },
    ],
  });
  const { stripe, deleted } = createStripeMock({
    onDelete: (customerId) => {
      if (customerId === ORG_CUSTOMER) {
        throw { code: "resource_missing", statusCode: 404 };
      }
    },
  });

  const { warnings } = await runCleanup(client, stripe);

  assertEquals(warnings, []);
  assertEquals(deleted, [TEST_CUSTOMER]);
  assertEquals(client.tables.org_stripe_customers, []);
  assertEquals(client.tables.user_stripe_customers, []);
});

Deno.test("retry after a partial failure only deletes what is left", async () => {
  const client = createMemoryClient({
    ...emptyTables(),
    organization_members: [
      { organization_id: ORG_ID, user_id: USER_ID, role: "owner" },
    ],
    org_stripe_customers: [
      { organization_id: ORG_ID, stripe_customer_id: ORG_CUSTOMER, livemode: false },
    ],
    user_stripe_customers: [
      { user_id: USER_ID, stripe_customer_id: TEST_CUSTOMER, livemode: false },
    ],
  });
  let failUser = true;
  const { stripe, deleted } = createStripeMock({
    onDelete: (customerId) => {
      if (customerId === TEST_CUSTOMER && failUser) {
        throw { statusCode: 500, message: "api_error" };
      }
    },
  });

  await assertRejects(() => runCleanup(client, stripe), StripeCustomerDeleteError);
  assertEquals(deleted, [ORG_CUSTOMER]);
  assertEquals(client.tables.org_stripe_customers, []);
  assertEquals(client.tables.user_stripe_customers.length, 1);

  failUser = false;
  await runCleanup(client, stripe);

  assertEquals(deleted, [ORG_CUSTOMER, TEST_CUSTOMER]);
  assertEquals(client.tables.user_stripe_customers, []);
});

Deno.test("customer still referenced by another owner is not deleted from Stripe", async () => {
  const client = createMemoryClient({
    ...emptyTables(),
    organization_members: [
      { organization_id: ORG_ID, user_id: USER_ID, role: "admin" },
      { organization_id: ORG_ID, user_id: OTHER_USER_ID, role: "owner" },
    ],
    org_stripe_customers: [
      { organization_id: ORG_ID, stripe_customer_id: TEST_CUSTOMER, livemode: false },
    ],
    user_stripe_customers: [
      { user_id: USER_ID, stripe_customer_id: TEST_CUSTOMER, livemode: false },
    ],
  });
  const { stripe, deleted } = createStripeMock();

  const { warnings } = await runCleanup(client, stripe);

  assertEquals(deleted, []);
  assertEquals(warnings.length, 1);
  assertEquals(client.tables.user_stripe_customers, []);
  assertEquals(client.tables.org_stripe_customers.length, 1);
});

Deno.test("a customer shared by a deleted org and the user is deleted once, after both refs", async () => {
  const client = createMemoryClient({
    ...emptyTables(),
    organization_members: [
      { organization_id: ORG_ID, user_id: USER_ID, role: "owner" },
    ],
    org_stripe_customers: [
      { organization_id: ORG_ID, stripe_customer_id: TEST_CUSTOMER, livemode: false },
    ],
    user_stripe_customers: [
      { user_id: USER_ID, stripe_customer_id: TEST_CUSTOMER, livemode: false },
    ],
  });
  const { stripe, deleted } = createStripeMock();

  await runCleanup(client, stripe);

  assertEquals(deleted, [TEST_CUSTOMER]);
  assertEquals(client.tables.org_stripe_customers, []);
  assertEquals(client.tables.user_stripe_customers, []);
});

Deno.test("clearRef leaves a ref that was replaced after it was read", async () => {
  const client = createMemoryClient({
    ...emptyTables(),
    user_stripe_customers: [
      { user_id: USER_ID, stripe_customer_id: "cus_replaced", livemode: false },
    ],
  });
  const refs = createSupabaseStripeRefStore(client as unknown as StripeRefClient);

  await refs.clearRef("user", USER_ID, false, TEST_CUSTOMER);

  assertEquals(client.tables.user_stripe_customers.length, 1);
});
