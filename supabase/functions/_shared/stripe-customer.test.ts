import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  getOrCreateStripeCustomer,
  getStoredStripeCustomerId,
  isLiveStripeKey,
} from "./stripe-customer.ts";

type StoredRow = {
  ownerId: string;
  livemode: boolean;
  stripeCustomerId: string;
};

type CreatedCustomer = {
  id: string;
  email?: string;
  metadata?: Record<string, string>;
  deleted?: boolean;
  idempotencyKey?: string;
};

const sameParams = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// honorIdempotency mimics Stripe: a reused key replays the first result, and a
// reused key with different parameters is rejected.
function createMockStripe(options?: { honorIdempotency?: boolean }) {
  const created: CreatedCustomer[] = [];
  const deleted: string[] = [];
  const updates: Array<{ id: string; email?: string; metadata?: Record<string, string> }> = [];
  const createParams = new Map<string, unknown>();
  let next = 1;

  return {
    created,
    deleted,
    updates,
    customers: {
      create: (
        params: { metadata?: Record<string, string>; email?: string },
        createOptions?: { idempotencyKey?: string },
      ) => {
        if (options?.honorIdempotency && createOptions?.idempotencyKey) {
          const previous = createParams.get(createOptions.idempotencyKey);
          if (previous !== undefined && !sameParams(previous, params)) {
            return Promise.reject(
              new Error("Keys for idempotent requests can only be used with the same parameters"),
            );
          }
          createParams.set(createOptions.idempotencyKey, params);
          const existing = created.find((row) =>
            row.idempotencyKey === createOptions.idempotencyKey && !row.deleted
          );
          if (existing) return Promise.resolve(existing);
        }
        const id = `cus_test_${next++}`;
        const row = {
          id,
          email: params.email,
          metadata: params.metadata,
          idempotencyKey: createOptions?.idempotencyKey,
        };
        created.push(row);
        return Promise.resolve(row);
      },
      update: (id: string, params: { email?: string; metadata?: Record<string, string> }) => {
        updates.push({ id, email: params.email, metadata: params.metadata });
        return Promise.resolve({ id });
      },
      del: (id: string) => {
        deleted.push(id);
        const row = created.find((item) => item.id === id);
        if (row) row.deleted = true;
        return Promise.resolve({ id });
      },
      list: () => {
        throw new Error("must not look up Stripe customers by email");
      },
    },
  };
}

function createMockStore() {
  const orgRows: StoredRow[] = [];
  const userRows: StoredRow[] = [];

  const rowsFor = (table: string) => (table === "org_stripe_customers" ? orgRows : userRows);
  const ownerKey = (table: string) => (table === "org_stripe_customers" ? "organization_id" : "user_id");

  return {
    orgRows,
    userRows,
    from(table: string) {
      let selectedOwner: string | undefined;
      let selectedLivemode: boolean | undefined;

      const query = {
        select(_columns: string) {
          return query;
        },
        eq(column: string, value: string | boolean) {
          if (column === ownerKey(table)) selectedOwner = String(value);
          if (column === "livemode") selectedLivemode = Boolean(value);
          return query;
        },
        maybeSingle() {
          const found = rowsFor(table).find((row) =>
            row.ownerId === selectedOwner && row.livemode === selectedLivemode
          );
          return Promise.resolve({
            data: found ? { stripe_customer_id: found.stripeCustomerId } : null,
            error: null,
          });
        },
        insert(row: Record<string, string | boolean>) {
          return Promise.resolve().then(() => {
            const ownerId = row[ownerKey(table)];
            const stripeCustomerId = row.stripe_customer_id;
            const livemode = Boolean(row.livemode);
            if (typeof ownerId !== "string" || typeof stripeCustomerId !== "string") {
              return { error: { message: "missing owner or customer id" } };
            }

            const existingOwner = rowsFor(table).find((item) =>
              item.ownerId === ownerId && item.livemode === livemode
            );
            const existingCustomer = rowsFor(table).find((item) =>
              item.stripeCustomerId === stripeCustomerId
            );
            if (existingOwner || existingCustomer) {
              return { error: { message: "duplicate key", code: "23505" } };
            }

            rowsFor(table).push({ ownerId, livemode, stripeCustomerId });
            return { error: null };
          });
        },
      };

      return query;
    },
  };
}

const testKey = "sk_test_example";
const liveKey = "sk_live_example";

Deno.test("AC1: two checkouts for the same org reuse one Stripe customer", async () => {
  const stripe = createMockStripe();
  const supabase = createMockStore();
  const owner = { orgId: "org-1" };
  const deps = { stripe, supabase, email: "buyer@example.test", stripeSecretKey: testKey };

  const first = await getOrCreateStripeCustomer(owner, deps);
  const second = await getOrCreateStripeCustomer(owner, deps);

  assertEquals(first, second);
  assertEquals(stripe.created.length, 1);
  assertEquals(first, "cus_test_1");
  assertEquals(stripe.created[0].email, undefined);
  assertEquals(stripe.updates[0]?.email, "buyer@example.test");
});

Deno.test("AC2: a personal purchase and an org purchase get different customers", async () => {
  const stripe = createMockStripe();
  const supabase = createMockStore();
  const deps = { stripe, supabase, email: "buyer@example.test", stripeSecretKey: testKey };

  const orgCustomer = await getOrCreateStripeCustomer({ orgId: "org-1" }, deps);
  const userCustomer = await getOrCreateStripeCustomer({ userId: "user-1" }, deps);

  assertEquals(orgCustomer, "cus_test_1");
  assertEquals(userCustomer, "cus_test_2");
  assertEquals(orgCustomer === userCustomer, false);
  assertEquals(stripe.created.length, 2);
});

Deno.test("AC3: the same email in different orgs never shares a customer", async () => {
  const stripe = createMockStripe();
  const supabase = createMockStore();
  const email = "buyer@example.test";
  const deps = { stripe, supabase, email, stripeSecretKey: testKey };

  const orgA = await getOrCreateStripeCustomer({ orgId: "org-a" }, deps);
  const orgB = await getOrCreateStripeCustomer({ orgId: "org-b" }, deps);

  assertEquals(orgA === orgB, false);
  assertEquals(stripe.created.length, 2);
  assertEquals(stripe.created[0].metadata?.organization_id, "org-a");
  assertEquals(stripe.created[1].metadata?.organization_id, "org-b");
});

Deno.test("test and live keys store different customers for the same org", async () => {
  const stripe = createMockStripe();
  const supabase = createMockStore();

  const testId = await getOrCreateStripeCustomer({ orgId: "org-1" }, {
    stripe,
    supabase,
    stripeSecretKey: testKey,
  });
  const liveId = await getOrCreateStripeCustomer({ orgId: "org-1" }, {
    stripe,
    supabase,
    stripeSecretKey: liveKey,
  });

  assertEquals(testId === liveId, false);
  assertEquals(supabase.orgRows.length, 2);
  assertEquals(supabase.orgRows[0].livemode, false);
  assertEquals(supabase.orgRows[1].livemode, true);
});

Deno.test("concurrent calls leave one ref and no orphan Stripe customers", async () => {
  const stripe = createMockStripe();
  const supabase = createMockStore();
  const owner = { orgId: "org-race" };
  const deps = { stripe, supabase, email: "buyer@example.test", stripeSecretKey: testKey };

  const ids = await Promise.all([
    getOrCreateStripeCustomer(owner, deps),
    getOrCreateStripeCustomer(owner, deps),
    getOrCreateStripeCustomer(owner, deps),
    getOrCreateStripeCustomer(owner, deps),
    getOrCreateStripeCustomer(owner, deps),
  ]);

  assertEquals(new Set(ids).size, 1);
  assertEquals(supabase.orgRows.length, 1);
  const liveCreated = stripe.created.filter((row) => !row.deleted);
  assertEquals(liveCreated.length, 1);
  assertEquals(stripe.deleted.length, stripe.created.length - 1);
  assertEquals(stripe.created[0].idempotencyKey, "cust:org:org-race:false");
});

Deno.test("checkout creates customers and portal does not", () => {
  const checkout = Deno.readTextFileSync(new URL("../create-checkout-session/index.ts", import.meta.url));
  const portal = Deno.readTextFileSync(new URL("../customer-portal/index.ts", import.meta.url));
  const helper = Deno.readTextFileSync(new URL("./stripe-customer.ts", import.meta.url));

  assertEquals(checkout.includes("customers.list("), false);
  assertEquals(portal.includes("customers.list("), false);
  assertEquals(helper.includes("customers.list"), false);
  assertEquals(checkout.includes("getOrCreateStripeCustomer"), true);
  assertEquals(portal.includes("getOrCreateStripeCustomer"), false);
  assertEquals(portal.includes("getStoredStripeCustomerId"), true);
  assertEquals(portal.includes("No Stripe customer found"), true);
});

Deno.test("does not look up Stripe customers by email", async () => {
  let listed = 0;
  const stripe = createMockStripe();
  const guarded = {
    created: stripe.created,
    deleted: stripe.deleted,
    updates: stripe.updates,
    customers: {
      create: stripe.customers.create,
      update: stripe.customers.update,
      del: stripe.customers.del,
      list: () => {
        listed += 1;
        throw new Error("must not look up Stripe customers by email");
      },
    },
  };
  const supabase = createMockStore();

  await getOrCreateStripeCustomer({ orgId: "org-1" }, {
    stripe: guarded,
    supabase,
    email: "buyer@example.test",
    stripeSecretKey: testKey,
  });

  assertEquals(listed, 0);
  assertEquals(stripe.created.length, 1);
});

Deno.test("concurrent calls with an honoring idempotency key create exactly one customer", async () => {
  const stripe = createMockStripe({ honorIdempotency: true });
  const supabase = createMockStore();
  const owner = { orgId: "org-race" };
  const deps = { stripe, supabase, email: "buyer@example.test", stripeSecretKey: testKey };

  const ids = await Promise.all(Array.from({ length: 5 }, () => getOrCreateStripeCustomer(owner, deps)));

  assertEquals(new Set(ids).size, 1);
  assertEquals(supabase.orgRows.length, 1);
  assertEquals(stripe.created.length, 1);
  assertEquals(stripe.deleted.length, 0);
});

Deno.test("two admins of one org racing never send different create parameters for one key", async () => {
  const stripe = createMockStripe({ honorIdempotency: true });
  const supabase = createMockStore();
  const owner = { orgId: "org-race" };
  const base = { stripe, supabase, stripeSecretKey: testKey };

  const ids = await Promise.all([
    getOrCreateStripeCustomer(owner, { ...base, email: "a@example.test", metadata: { user_id: "admin-a" } }),
    getOrCreateStripeCustomer(owner, { ...base, email: "b@example.test", metadata: { user_id: "admin-b" } }),
  ]);

  assertEquals(ids[0], ids[1]);
  assertEquals(stripe.created.length, 1);
  assertEquals(stripe.created[0].metadata, { organization_id: "org-race", livemode: "false" });
  // The caller's own metadata still lands on the customer, through update.
  assertEquals(stripe.updates.some((row) => row.metadata?.user_id === "admin-a"), true);
});

Deno.test("a store failure after create is retried onto the same Stripe customer", async () => {
  const stripe = createMockStripe({ honorIdempotency: true });
  const supabase = createMockStore();
  const owner = { orgId: "org-retry" };
  const realFrom = supabase.from.bind(supabase);
  let failNextInsert = true;
  const flaky = {
    from(table: string) {
      const query = realFrom(table);
      const insert = query.insert.bind(query);
      query.insert = (row: Record<string, string | boolean>) => {
        if (failNextInsert) {
          failNextInsert = false;
          return Promise.resolve({ error: { message: "timeout", code: "57014" } });
        }
        return insert(row);
      };
      return query;
    },
  };
  const deps = { stripe, supabase: flaky, stripeSecretKey: testKey };

  await assertRejects(() => getOrCreateStripeCustomer(owner, deps), Error, "Failed to store");
  const retried = await getOrCreateStripeCustomer(owner, deps);

  assertEquals(retried, "cus_test_1");
  assertEquals(stripe.created.length, 1);
  assertEquals(supabase.orgRows.length, 1);
});

Deno.test("only a 23505 store error counts as a lost race", async () => {
  const stripe = createMockStripe();
  const supabase = createMockStore();
  const failing = {
    from(table: string) {
      const query = supabase.from(table);
      query.insert = () => Promise.resolve({ error: { message: "violates unique constraint (but no code)" } });
      return query;
    },
  };

  await assertRejects(
    () => getOrCreateStripeCustomer({ orgId: "org-1" }, { stripe, supabase: failing, stripeSecretKey: testKey }),
    Error,
    "Failed to store",
  );
});

Deno.test("getStoredStripeCustomerId reads the stored ref and never creates", async () => {
  const stripe = createMockStripe();
  const supabase = createMockStore();

  assertEquals(await getStoredStripeCustomerId({ orgId: "org-1" }, { supabase, stripeSecretKey: testKey }), null);

  const created = await getOrCreateStripeCustomer({ orgId: "org-1" }, { stripe, supabase, stripeSecretKey: testKey });
  assertEquals(await getStoredStripeCustomerId({ orgId: "org-1" }, { supabase, stripeSecretKey: testKey }), created);
  assertEquals(await getStoredStripeCustomerId({ orgId: "org-1" }, { supabase, stripeSecretKey: liveKey }), null);
  assertEquals(stripe.created.length, 1);
});

Deno.test("live and restricted live keys are live mode", () => {
  assertEquals(isLiveStripeKey("sk_live_example"), true);
  assertEquals(isLiveStripeKey("rk_live_example"), true);
  assertEquals(isLiveStripeKey("sk_test_example"), false);
  assertEquals(isLiveStripeKey(undefined), false);
});
