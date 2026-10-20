import { assertEquals, assertRejects, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  type BackfillStripeCustomer,
  assertApplyAllowed,
  assertFixtureNotUsedForApply,
  formatBackfillPlan,
  isLiveStripeKey,
  loadBackfillFixture,
  loadHubSnapshot,
  loadStripeCustomers,
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
  assertEquals(plan.orgWrites[0].livemode, false);
  assertEquals(plan.orgWrites[0].email_masked, "b***@example.test");
  const printed = formatBackfillPlan(plan);
  assertEquals(printed.includes("buyer@example.test"), false);
  assertEquals(printed.includes("b***@example.test"), true);
});

Deno.test("user match skips Stripe customers that already have organization_id", () => {
  const plan = planStripeCustomerBackfill({
    livemode: false,
    organizations: [],
    users: [{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", email: "buyer@example.test" }],
    subscriptions: [],
    existingOrgRefs: [],
    existingUserRefs: [],
    stripeCustomers: [
      {
        id: "cus_test_org_a",
        email: "buyer@example.test",
        metadata: {
          organization_id: "11111111-1111-4111-8111-111111111111",
          user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        },
      },
      {
        id: "cus_test_user_a",
        email: "buyer@example.test",
        metadata: { user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
      },
    ],
  }, true);
  assertEquals(plan.userWrites.length, 1);
  assertEquals(plan.userWrites[0].stripe_customer_id, "cus_test_user_a");
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

Deno.test("--apply cannot use a fixture", () => {
  assertThrows(
    () => assertFixtureNotUsedForApply(true, true),
    Error,
    "fixtures are for tests only",
  );
  assertFixtureNotUsedForApply(false, true);
  assertFixtureNotUsedForApply(true, false);
});

const ORG = "11111111-1111-4111-8111-111111111111";

function planWithSubscription(stripeCustomers: BackfillStripeCustomer[]) {
  return planStripeCustomerBackfill({
    livemode: false,
    organizations: [{ id: ORG, adminEmails: [] }],
    users: [],
    subscriptions: [{ organization_id: ORG, stripe_customer_id: "cus_sub" }],
    existingOrgRefs: [],
    existingUserRefs: [],
    stripeCustomers,
  }, true);
}

Deno.test("a subscription customer is used only when Stripe returns it in this mode", () => {
  assertEquals(planWithSubscription([{ id: "cus_sub" }]).orgWrites.map((row) => row.stripe_customer_id), ["cus_sub"]);
  assertEquals(planWithSubscription([]).orgWrites.length, 0);
  assertEquals(planWithSubscription([{ id: "cus_sub", deleted: true }]).orgWrites.length, 0);
});

type Row = Record<string, unknown>;

// Mimics a PostgREST client that caps each response at `cap` rows.
function fakeHub(tables: Record<string, Row[]>, cap = 1000) {
  const reads: string[] = [];
  const client = {
    from(table: string) {
      return {
        select(_columns: string) {
          let rows = tables[table];
          let range: [number, number] = [0, cap - 1];
          const builder = {
            eq(column: string, value: string | boolean) {
              rows = rows?.filter((row) => row[column] === value);
              return builder;
            },
            order(_column: string) {
              return builder;
            },
            range(from: number, to: number) {
              range = [from, Math.min(to, from + cap - 1)];
              return builder;
            },
            then<T>(resolve: (value: { data: unknown; error: { message: string } | null }) => T) {
              reads.push(table);
              const result = rows
                ? { data: rows.slice(range[0], range[1] + 1), error: null }
                : { data: null, error: { message: `relation "public.${table}" does not exist` } };
              return Promise.resolve(result).then(resolve);
            },
          };
          return builder;
        },
      };
    },
  };
  return { client, reads };
}

const emptyHub = (): Record<string, Row[]> => ({
  orders: [],
  org_billing_profiles: [],
  subscriptions: [],
  organization_members: [],
  profiles: [],
  training_leads: [],
  academy_entitlements: [],
  org_stripe_customers: [],
  user_stripe_customers: [],
});

Deno.test("loadHubSnapshot pages past the PostgREST row cap", async () => {
  const tables = emptyHub();
  tables.profiles = Array.from({ length: 2500 }, (_, i) => ({ user_id: `u${i}`, email: `u${i}@example.test` }));
  tables.academy_entitlements = [{ user_id: "u2400", subject_type: "user" }];
  tables.organization_members = [];
  const { client } = fakeHub(tables);

  const snapshot = await loadHubSnapshot(client as never, false);

  assertEquals(snapshot.users.map((user) => user.id), ["u2400"]);
  assertEquals(snapshot.users[0].email, "u2400@example.test");
});

Deno.test("loadHubSnapshot reads org admins, owners and subscriptions and fails on a missing table", async () => {
  const tables = emptyHub();
  tables.organization_members = [
    { organization_id: ORG, user_id: "admin", role: "admin" },
    { organization_id: ORG, user_id: "member", role: "member" },
  ];
  tables.profiles = [
    { user_id: "admin", email: "admin@example.test" },
    { user_id: "member", email: "member@example.test" },
  ];
  tables.subscriptions = [{ organization_id: ORG, stripe_customer_id: "cus_sub" }];
  const snapshot = await loadHubSnapshot(fakeHub(tables).client as never, false);
  assertEquals(snapshot.organizations, [{ id: ORG, adminEmails: ["admin@example.test"] }]);

  const missing = emptyHub();
  delete missing.academy_entitlements;
  await assertRejects(() => loadHubSnapshot(fakeHub(missing).client as never, false), Error, "does not exist");
});

Deno.test("loadStripeCustomers keeps only this mode, fetches subscription customers by id and queries both email cases", async () => {
  const asked: string[] = [];
  const retrieved: string[] = [];
  const customers = await loadStripeCustomers(
    {
      listByEmail: (email) => {
        asked.push(email);
        return Promise.resolve(email === "Buyer@Example.test"
          ? [{ id: "cus_a", livemode: false }, { id: "cus_live", livemode: true }]
          : []);
      },
      retrieve: (id) => {
        retrieved.push(id);
        return Promise.resolve(id === "cus_gone" ? null : { id, livemode: false });
      },
    },
    ["Buyer@Example.test"],
    ["cus_a", "cus_sub", "cus_gone"],
    false,
  );

  assertEquals(asked, ["Buyer@Example.test", "buyer@example.test"]);
  assertEquals(retrieved, ["cus_sub", "cus_gone"]);
  assertEquals(customers.map((customer) => customer.id), ["cus_a", "cus_sub"]);
});

Deno.test("restricted live keys count as live", () => {
  assertEquals(isLiveStripeKey("rk_live_example"), true);
  assertEquals(isLiveStripeKey("sk_test_example"), false);
});
