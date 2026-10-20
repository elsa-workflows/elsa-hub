import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  assertEquals,
  assertRejects,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assertNoStripeRefsWithoutKey,
  cleanupStripeCustomersForUserDelete,
  StripeCustomerDeleteError,
  StripeNotConfiguredError,
} from "./cleanup.ts";
import {
  createSupabaseStripeRefStore,
  livemodeFromStripeSecretKey,
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

// A real supabase-js client whose HTTP layer is an in-memory PostgREST: the
// production query code runs unchanged and needs no cast to a narrow type.
function createMemoryClient(tables: Tables) {
  const rows = (table: string) => (tables as Record<string, Row[]>)[table] ?? [];

  const fakeFetch = (input: Request | URL | string, init?: RequestInit) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const table = url.pathname.split("/").pop()!;
    const predicates: Array<(row: Row) => boolean> = [];
    for (const [column, filter] of url.searchParams) {
      if (column === "select") continue;
      const dot = filter.indexOf(".");
      const operator = filter.slice(0, dot);
      const operand = filter.slice(dot + 1);
      if (operator === "eq") {
        predicates.push((row) => String(row[column]) === operand);
      } else if (operator === "neq") {
        predicates.push((row) => String(row[column]) !== operand);
      } else if (operator === "in") {
        const allowed = new Set(operand.slice(1, -1).split(","));
        predicates.push((row) => allowed.has(String(row[column])));
      } else {
        throw new Error(`memory client does not support ${filter}`);
      }
    }
    const matched = rows(table).filter((row) => predicates.every((p) => p(row)));

    if (request.method === "DELETE") {
      const removing = new Set(matched);
      (tables as Record<string, Row[]>)[table] = rows(table).filter(
        (row) => !removing.has(row),
      );
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    return Promise.resolve(Response.json(matched));
  };

  return Object.assign(
    createClient("http://memory.test", "anon-key", { global: { fetch: fakeFetch } }),
    { tables },
  );
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
  const refs = createSupabaseStripeRefStore(client);

  const { warnings } = await cleanupStripeCustomersForUserDelete({
    serviceClient: client,
    stripe,
    refs,
    userId: USER_ID,
    livemode,
  });

  // The live ref is left alone but named: the cascade will drop it.
  assertEquals(warnings.length, 1);
  assertEquals(warnings[0].includes(LIVE_CUSTOMER), true);
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
  const refs = createSupabaseStripeRefStore(client);

  await cleanupStripeCustomersForUserDelete({
    serviceClient: client,
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
  const refs = createSupabaseStripeRefStore(client);

  await cleanupStripeCustomersForUserDelete({
    serviceClient: client,
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
  const refs = createSupabaseStripeRefStore(client);

  await cleanupStripeCustomersForUserDelete({
    serviceClient: client,
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
  const refs = createSupabaseStripeRefStore(client);

  await cleanupStripeCustomersForUserDelete({
    serviceClient: client,
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
  const refs = createSupabaseStripeRefStore(client);

  const err = await assertRejects(
    () =>
      cleanupStripeCustomersForUserDelete({
        serviceClient: client,
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
    serviceClient: client,
    stripe,
    refs: createSupabaseStripeRefStore(client),
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
  const refs = createSupabaseStripeRefStore(client);

  await refs.clearRef("user", USER_ID, false, TEST_CUSTOMER);

  assertEquals(client.tables.user_stripe_customers.length, 1);
});

Deno.test("other-mode refs of the user and a sole-owned org are named, never deleted", async () => {
  const client = createMemoryClient({
    ...emptyTables(),
    organization_members: [
      { organization_id: ORG_ID, user_id: USER_ID, role: "owner" },
    ],
    org_stripe_customers: [
      { organization_id: ORG_ID, stripe_customer_id: "cus_live_org", livemode: true },
    ],
    user_stripe_customers: [
      { user_id: USER_ID, stripe_customer_id: LIVE_CUSTOMER, livemode: true },
    ],
  });
  const { stripe, deleted } = createStripeMock();

  const { warnings } = await runCleanup(client, stripe);

  assertEquals(deleted, []);
  assertEquals(warnings.length, 2);
  assertEquals(warnings.some((w) => w.includes("cus_live_org")), true);
  assertEquals(warnings.some((w) => w.includes(LIVE_CUSTOMER)), true);
  assertEquals(client.tables.org_stripe_customers.length, 1);
  assertEquals(client.tables.user_stripe_customers.length, 1);
});

Deno.test("other-mode refs of an org with another owner are not reported", async () => {
  const client = createMemoryClient({
    ...emptyTables(),
    organization_members: [
      { organization_id: ORG_ID, user_id: USER_ID, role: "owner" },
      { organization_id: ORG_ID, user_id: OTHER_USER_ID, role: "owner" },
    ],
    org_stripe_customers: [
      { organization_id: ORG_ID, stripe_customer_id: "cus_live_org", livemode: true },
    ],
  });
  const { stripe } = createStripeMock();

  const { warnings } = await runCleanup(client, stripe);

  assertEquals(warnings, []);
});

Deno.test("no Stripe key and a ref in either mode: refuses with the customer ids", async () => {
  for (const livemode of [false, true]) {
    const client = createMemoryClient({
      ...emptyTables(),
      user_stripe_customers: [
        { user_id: USER_ID, stripe_customer_id: TEST_CUSTOMER, livemode },
      ],
    });
    const err = await assertRejects(
      () =>
        assertNoStripeRefsWithoutKey({
          serviceClient: client,
          refs: createSupabaseStripeRefStore(client),
          userId: USER_ID,
        }),
      StripeNotConfiguredError,
    );
    assertEquals(err.message.includes(TEST_CUSTOMER), true);
  }
});

Deno.test("no Stripe key and a sole-owned org ref: refuses", async () => {
  const client = createMemoryClient({
    ...emptyTables(),
    organization_members: [
      { organization_id: ORG_ID, user_id: USER_ID, role: "owner" },
    ],
    org_stripe_customers: [
      { organization_id: ORG_ID, stripe_customer_id: ORG_CUSTOMER, livemode: true },
    ],
  });
  await assertRejects(
    () =>
      assertNoStripeRefsWithoutKey({
        serviceClient: client,
        refs: createSupabaseStripeRefStore(client),
        userId: USER_ID,
      }),
    StripeNotConfiguredError,
  );
});

Deno.test("no Stripe key and no refs: continues", async () => {
  const client = createMemoryClient({
    ...emptyTables(),
    user_stripe_customers: [
      { user_id: OTHER_USER_ID, stripe_customer_id: "cus_other", livemode: false },
    ],
  });
  await assertNoStripeRefsWithoutKey({
    serviceClient: client,
    refs: createSupabaseStripeRefStore(client),
    userId: USER_ID,
  });
});

Deno.test("Stripe 404 saying the customer exists in the other mode: keeps the ref and fails", async () => {
  for (const mode of ["live", "test"]) {
    const client = createMemoryClient({
      ...emptyTables(),
      user_stripe_customers: [
        { user_id: USER_ID, stripe_customer_id: TEST_CUSTOMER, livemode: false },
      ],
    });
    const { stripe, deleted } = createStripeMock({
      onDelete: () => {
        throw {
          code: "resource_missing",
          statusCode: 404,
          message:
            `No such customer: '${TEST_CUSTOMER}'; a similar object exists in ${mode} mode, but a different mode key was used to make this request.`,
        };
      },
    });

    await assertRejects(() => runCleanup(client, stripe), StripeCustomerDeleteError);

    assertEquals(deleted, []);
    assertEquals(client.tables.user_stripe_customers.length, 1);
  }
});

Deno.test("a customer shared by a deleted org and the user does not warn as kept", async () => {
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
  const { stripe } = createStripeMock();

  const { warnings } = await runCleanup(client, stripe);

  assertEquals(warnings, []);
});
