import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { getOrCreateStripeCustomer } from "./stripe-customer.ts";

type StoredRow = {
  ownerId: string;
  stripeCustomerId: string;
};

function createMockStripe() {
  const created: Array<{ id: string; email?: string; metadata?: Record<string, string> }> = [];
  let next = 1;

  return {
    created,
    customers: {
      create: (params: { email?: string; metadata?: Record<string, string> }) => {
        const id = `cus_test_${next++}`;
        const row = { id, email: params.email, metadata: params.metadata };
        created.push(row);
        return Promise.resolve(row);
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
  let insertImpl: ((table: string, row: Record<string, string | null>) => { error: { message: string; code?: string } | null }) | null = null;

  const rowsFor = (table: string) => (table === "org_stripe_customers" ? orgRows : userRows);
  const ownerKey = (table: string) => (table === "org_stripe_customers" ? "organization_id" : "user_id");

  return {
    orgRows,
    userRows,
    setInsertImpl(
      impl: (table: string, row: Record<string, string | null>) => { error: { message: string; code?: string } | null },
    ) {
      insertImpl = impl;
    },
    from(table: string) {
      let selectedOwner: string | undefined;

      const query = {
        select(_columns: string) {
          return query;
        },
        eq(column: string, value: string) {
          if (column === ownerKey(table)) selectedOwner = value;
          return query;
        },
        maybeSingle() {
          const found = rowsFor(table).find((row) => row.ownerId === selectedOwner);
          return Promise.resolve({
            data: found ? { stripe_customer_id: found.stripeCustomerId } : null,
            error: null,
          });
        },
        insert(row: Record<string, string | null>) {
          if (insertImpl) return Promise.resolve(insertImpl(table, row));

          const ownerId = row[ownerKey(table)];
          const stripeCustomerId = row.stripe_customer_id;
          if (!ownerId || !stripeCustomerId) {
            return Promise.resolve({ error: { message: "missing owner or customer id" } });
          }

          const existingOwner = rowsFor(table).find((item) => item.ownerId === ownerId);
          const existingCustomer = rowsFor(table).find((item) => item.stripeCustomerId === stripeCustomerId);
          if (existingOwner || existingCustomer) {
            return Promise.resolve({ error: { message: "duplicate key", code: "23505" } });
          }

          rowsFor(table).push({ ownerId, stripeCustomerId });
          return Promise.resolve({ error: null });
        },
      };

      return query;
    },
  };
}

Deno.test("AC1: two checkouts for the same org reuse one Stripe customer", async () => {
  const stripe = createMockStripe();
  const supabase = createMockStore();
  const owner = { orgId: "org-1" };
  const deps = { stripe, supabase, email: "buyer@example.test" };

  const first = await getOrCreateStripeCustomer(owner, deps);
  const second = await getOrCreateStripeCustomer(owner, deps);

  assertEquals(first, second);
  assertEquals(stripe.created.length, 1);
  assertEquals(first, "cus_test_1");
});

Deno.test("AC2: a personal purchase and an org purchase get different customers", async () => {
  const stripe = createMockStripe();
  const supabase = createMockStore();
  const deps = { stripe, supabase, email: "buyer@example.test" };

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

  const orgA = await getOrCreateStripeCustomer({ orgId: "org-a" }, { stripe, supabase, email });
  const orgB = await getOrCreateStripeCustomer({ orgId: "org-b" }, { stripe, supabase, email });

  assertEquals(orgA === orgB, false);
  assertEquals(stripe.created.length, 2);
  assertEquals(stripe.created[0].email, email);
  assertEquals(stripe.created[1].email, email);
  assertEquals(stripe.created[0].metadata?.organization_id, "org-a");
  assertEquals(stripe.created[1].metadata?.organization_id, "org-b");
});

Deno.test("concurrent org creates re-read the stored customer after a unique conflict", async () => {
  const stripe = createMockStripe();
  const supabase = createMockStore();

  supabase.setInsertImpl((table, row) => {
    const ownerId = table === "org_stripe_customers" ? row.organization_id : row.user_id;
    if (ownerId && row.stripe_customer_id && supabase.orgRows.length === 0) {
      supabase.orgRows.push({ ownerId, stripeCustomerId: "cus_test_winner" });
    }
    return { error: { message: "duplicate key", code: "23505" } };
  });

  const id = await getOrCreateStripeCustomer({ orgId: "org-1" }, {
    stripe,
    supabase,
    email: "buyer@example.test",
  });

  assertEquals(id, "cus_test_winner");
  assertEquals(stripe.created.length, 1);
});

Deno.test("AC4 migration: org admins can read the org ref and writers are service_role only", () => {
  const migration = Deno.readTextFileSync(
    new URL("../../migrations/20261015193000_stripe_customer_refs.sql", import.meta.url),
  );
  const sqlTests = Deno.readTextFileSync(
    new URL("../../tests/database/stripe_customer_refs.sql", import.meta.url),
  );

  assertEquals(migration.includes("ENABLE ROW LEVEL SECURITY"), true);
  assertEquals(migration.includes("USING (public.is_org_admin(organization_id))"), true);
  assertEquals(migration.includes("USING (user_id = auth.uid())"), true);
  assertEquals(migration.includes("FOR INSERT"), false);
  assertEquals(migration.includes("FOR UPDATE"), false);
  assertEquals(migration.includes("FOR DELETE"), false);
  assertEquals(migration.includes("GRANT SELECT ON TABLE public.org_stripe_customers TO authenticated"), true);
  assertEquals(migration.includes("GRANT ALL ON TABLE public.org_stripe_customers TO service_role"), true);
  assertEquals(sqlTests.includes("AC4 non-admin cannot read org customer ref"), true);
});

Deno.test("checkout and portal no longer list Stripe customers by email", () => {
  const checkout = Deno.readTextFileSync(new URL("../create-checkout-session/index.ts", import.meta.url));
  const portal = Deno.readTextFileSync(new URL("../customer-portal/index.ts", import.meta.url));
  const helper = Deno.readTextFileSync(new URL("./stripe-customer.ts", import.meta.url));

  assertEquals(checkout.includes("customers.list("), false);
  assertEquals(portal.includes("customers.list("), false);
  assertEquals(helper.includes("customers.list"), false);
  assertEquals(checkout.includes("getOrCreateStripeCustomer"), true);
  assertEquals(portal.includes("getOrCreateStripeCustomer"), true);
});

Deno.test("does not look up Stripe customers by email", async () => {
  let listed = 0;
  const stripe = createMockStripe();
  const guarded = {
    created: stripe.created,
    customers: {
      create: stripe.customers.create,
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
  });

  assertEquals(listed, 0);
  assertEquals(stripe.created.length, 1);
});
