import { assertEquals, assertRejects, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  type BackfillSnapshot,
  type BackfillStripeCustomer,
  backfillLivemode,
  assertApplyAllowed,
  assertFixtureNotUsedForApply,
  formatBackfillPlan,
  loadBackfillFixture,
  loadHubSnapshot,
  loadStripeCustomers,
  planStripeCustomerBackfill,
  stripeApiSource,
} from "./backfill-stripe-customers.ts";
import { stripeKeyMode } from "../supabase/functions/_shared/stripe-customer.ts";

const fixture = loadBackfillFixture();

Deno.test("dry-run fixture matches one org, one user, and does not share a customer", () => {
  const plan = planStripeCustomerBackfill(fixture, true);
  assertEquals(plan.counts.orgs_scanned, 2);
  assertEquals(plan.counts.orgs_matched, 2);
  assertEquals(plan.counts.orgs_would_write, 2);
  assertEquals(plan.counts.orgs_skipped_shared, 0);
  assertEquals(plan.counts.orgs_skipped_ambiguous, 0);
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
    "test key",
  );
  assertApplyAllowed({ apply: true, live: false, stripeSecretKey: "sk_test_example" });
  assertApplyAllowed({ apply: true, live: false, stripeSecretKey: "rk_test_example" });
  assertThrows(() => assertApplyAllowed({ apply: true, live: false, stripeSecretKey: "" }), Error, "test key");
  assertApplyAllowed({ apply: true, live: true, stripeSecretKey: "sk_live_example" });
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
  const orders: Record<string, string[]> = {};
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
            order(column: string) {
              (orders[table] ??= []).push(column);
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
  return { client, reads, orders };
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

Deno.test("loadHubSnapshot pages the ref tables by owner column, then livemode", async () => {
  const { client, orders } = fakeHub(emptyHub());
  await loadHubSnapshot(client as never, false);
  assertEquals(orders.org_stripe_customers, ["organization_id", "livemode"]);
  assertEquals(orders.user_stripe_customers, ["user_id", "livemode"]);
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
      searchByOrganizationId: () => Promise.resolve([]),
      retrieve: (id) => {
        retrieved.push(id);
        return Promise.resolve(id === "cus_gone" ? null : { id, livemode: false });
      },
    },
    { emails: ["Buyer@Example.test"], customerIds: ["cus_a", "cus_sub", "cus_gone"], organizationIds: [], livemode: false },
  );

  assertEquals(asked, ["Buyer@Example.test", "buyer@example.test"]);
  assertEquals(retrieved, ["cus_sub", "cus_gone"]);
  assertEquals(customers.map((customer) => customer.id), ["cus_a", "cus_sub"]);
});

Deno.test("restricted live keys count as live", () => {
  assertEquals(stripeKeyMode("rk_live_example"), "live");
  assertEquals(stripeKeyMode("sk_test_example"), "test");
});

const ORG_2 = "22222222-2222-4222-8222-222222222222";
const ORG_3 = "33333333-3333-4333-8333-333333333333";

function planOrgs(
  organizations: Array<{ id: string; adminEmails: string[] }>,
  subscriptions: Array<{ organization_id: string; stripe_customer_id: string }>,
  stripeCustomers: BackfillStripeCustomer[],
) {
  return planStripeCustomerBackfill({
    livemode: false,
    organizations,
    users: [],
    subscriptions,
    existingOrgRefs: [],
    existingUserRefs: [],
    stripeCustomers,
  }, true);
}

Deno.test("orgs that share a subscription customer are all skipped and the customer id is reported", () => {
  const plan = planOrgs(
    [{ id: ORG, adminEmails: [] }, { id: ORG_2, adminEmails: [] }, { id: ORG_3, adminEmails: [] }],
    [
      { organization_id: ORG, stripe_customer_id: "cus_shared" },
      { organization_id: ORG_2, stripe_customer_id: "cus_shared" },
      { organization_id: ORG_3, stripe_customer_id: "cus_own" },
    ],
    [{ id: "cus_shared" }, { id: "cus_own" }],
  );
  assertEquals(plan.orgWrites.map((row) => row.organization_id), [ORG_3]);
  assertEquals(plan.counts.orgs_skipped_shared, 2);
  const printed = formatBackfillPlan(plan);
  assertEquals(printed.includes("cus_shared"), true);
  assertEquals(printed.includes(ORG) && printed.includes(ORG_2), true);
});

Deno.test("a shared subscription customer is not handed to any org by metadata either", () => {
  const plan = planOrgs(
    [{ id: ORG, adminEmails: [] }, { id: ORG_2, adminEmails: [] }, { id: ORG_3, adminEmails: [] }],
    [
      { organization_id: ORG, stripe_customer_id: "cus_shared" },
      { organization_id: ORG_2, stripe_customer_id: "cus_shared" },
    ],
    [{ id: "cus_shared", metadata: { organization_id: ORG_3 } }],
  );
  assertEquals(plan.orgWrites.length, 0);
});

Deno.test("a subscription customer whose metadata names another org is refused", () => {
  const plan = planOrgs(
    [{ id: ORG, adminEmails: [] }],
    [{ organization_id: ORG, stripe_customer_id: "cus_sub" }],
    [{ id: "cus_sub", metadata: { organization_id: ORG_2 } }],
  );
  assertEquals(plan.orgWrites.length, 0);
});

Deno.test("metadata naming the org is trusted when its email is no longer an admin's", () => {
  const plan = planOrgs(
    [{ id: ORG, adminEmails: ["current@example.test"] }],
    [],
    [{ id: "cus_old", email: "former@example.test", metadata: { organization_id: ORG } }],
  );
  assertEquals(plan.orgWrites.map((row) => row.stripe_customer_id), ["cus_old"]);
});

Deno.test("several metadata customers are tied-broken by admin email, else the org is skipped and reported", () => {
  const customers: BackfillStripeCustomer[] = [
    { id: "cus_a", email: "former@example.test", metadata: { organization_id: ORG } },
    { id: "cus_b", email: "current@example.test", metadata: { organization_id: ORG } },
  ];
  const broken = planOrgs([{ id: ORG, adminEmails: ["current@example.test"] }], [], customers);
  assertEquals(broken.orgWrites.map((row) => row.stripe_customer_id), ["cus_b"]);

  const tied = planOrgs([{ id: ORG, adminEmails: ["nobody@example.test"] }], [], customers);
  assertEquals(tied.orgWrites.length, 0);
  assertEquals(tied.counts.orgs_skipped_ambiguous, 1);
  assertEquals(tied.counts.orgs_skipped_shared, 0);
  const printed = formatBackfillPlan(tied);
  assertEquals(printed.includes("cus_a") && printed.includes("cus_b"), true);
});

Deno.test("a subscription customer is reserved for its org even when its metadata names another org", () => {
  const ORG_B = ORG_2;
  const plan = planOrgs(
    [{ id: ORG, adminEmails: ["x@example.test"] }, { id: ORG_B, adminEmails: ["x@example.test"] }],
    [{ organization_id: ORG, stripe_customer_id: "cus_1" }],
    [{ id: "cus_1", email: "x@example.test", metadata: { organization_id: ORG_B } }],
  );
  assertEquals(plan.orgWrites.length, 0);
  // Both orgs are reported: ORG owns the row, ORG_B is the org the metadata names.
  assertEquals(plan.skippedOrgs, [
    { organization_id: ORG, reason: "metadata_conflicts_subscription", stripe_customer_ids: ["cus_1"] },
    { organization_id: ORG_B, reason: "metadata_conflicts_subscription", stripe_customer_ids: ["cus_1"] },
  ]);
  assertEquals(plan.counts.orgs_skipped_metadata_conflict, 2);
  const printed = formatBackfillPlan(plan);
  assertEquals(printed.includes("orgs_skipped_metadata_conflict=2"), true);
  assertEquals(printed.includes("orgs_skipped_ambiguous=0"), true);
  assertEquals(printed.includes(`org_skipped organization_id=${ORG} reason=metadata_conflicts_subscription`), true);
});

Deno.test("a subscription customer is not given to another org by email, nor to a user", () => {
  const snapshot = {
    livemode: false,
    organizations: [{ id: ORG, adminEmails: [] }, { id: ORG_2, adminEmails: ["x@example.test"] }],
    users: [{ id: "u1", email: "x@example.test" }],
    subscriptions: [{ organization_id: ORG, stripe_customer_id: "cus_1" }],
    existingOrgRefs: [],
    existingUserRefs: [],
    stripeCustomers: [{ id: "cus_1", email: "x@example.test" }],
  };
  const plan = planStripeCustomerBackfill(snapshot, true);
  assertEquals(plan.orgWrites.map((row) => [row.organization_id, row.stripe_customer_id]), [[ORG, "cus_1"]]);
  assertEquals(plan.userWrites.length, 0);
});

Deno.test("--apply without --live requires an explicit test key and refuses unknown prefixes", () => {
  assertThrows(() => assertApplyAllowed({ apply: true, live: false, stripeSecretKey: "whsec_x" }));
  assertThrows(() => assertApplyAllowed({ apply: true, live: false, stripeSecretKey: "pk_test_x" }));
  assertThrows(() => assertApplyAllowed({ apply: true, live: false, stripeSecretKey: "" }));
  assertThrows(() => assertApplyAllowed({ apply: true, live: false, stripeSecretKey: "rk_live_x" }));
  assertApplyAllowed({ apply: true, live: false, stripeSecretKey: "sk_test_x" });
  assertApplyAllowed({ apply: true, live: false, stripeSecretKey: "rk_test_x" });
  assertApplyAllowed({ apply: true, live: true, stripeSecretKey: "rk_live_x" });
  assertApplyAllowed({ apply: false, live: false, stripeSecretKey: "whsec_x" });
});

Deno.test("stripeKeyMode throws on an unknown prefix", () => {
  assertEquals(stripeKeyMode("sk_live_x"), "live");
  assertEquals(stripeKeyMode("rk_test_x"), "test");
  assertThrows(() => stripeKeyMode("whsec_x"));
});

Deno.test("backfillLivemode is strict: an unrecognised or missing key throws, also with --live", () => {
  assertEquals(backfillLivemode("sk_live_x"), true);
  assertEquals(backfillLivemode("rk_live_x"), true);
  assertEquals(backfillLivemode("sk_test_x"), false);
  assertThrows(() => backfillLivemode("whsec_x"));
  assertThrows(() => backfillLivemode(""));
  assertThrows(() => backfillLivemode(undefined));
});

const BASE: BackfillSnapshot = {
  livemode: false,
  organizations: [],
  users: [],
  subscriptions: [],
  existingOrgRefs: [],
  existingUserRefs: [],
  stripeCustomers: [],
};

const skippedFor = (plan: ReturnType<typeof planStripeCustomerBackfill>, orgId: string) =>
  plan.skippedOrgs.find((row) => row.organization_id === orgId);

Deno.test("P1: org B named by a customer on org A's subscription row is reported when A already has a stored ref", () => {
  const plan = planStripeCustomerBackfill({
    ...BASE,
    organizations: [{ id: ORG, adminEmails: [] }, { id: ORG_2, adminEmails: [] }],
    subscriptions: [{ organization_id: ORG, stripe_customer_id: "cus_X" }],
    existingOrgRefs: [{ organization_id: ORG, stripe_customer_id: "cus_stored", livemode: false }],
    stripeCustomers: [{ id: "cus_X", metadata: { organization_id: ORG_2 } }, { id: "cus_stored" }],
  }, true);
  assertEquals(plan.orgWrites.length, 0);
  assertEquals(skippedFor(plan, ORG_2), {
    organization_id: ORG_2,
    reason: "metadata_conflicts_subscription",
    stripe_customer_ids: ["cus_X"],
  });
  assertEquals(plan.counts.orgs_skipped_metadata_conflict, 1);
});

Deno.test("P2: org B named by a customer on org A's subscription row is reported when A has another clean customer", () => {
  const plan = planStripeCustomerBackfill({
    ...BASE,
    organizations: [{ id: ORG, adminEmails: [] }, { id: ORG_2, adminEmails: [] }],
    subscriptions: [
      { organization_id: ORG, stripe_customer_id: "cus_X" },
      { organization_id: ORG, stripe_customer_id: "cus_clean" },
    ],
    stripeCustomers: [{ id: "cus_X", metadata: { organization_id: ORG_2 } }, { id: "cus_clean" }],
  }, true);
  assertEquals(plan.orgWrites.map((row) => [row.organization_id, row.stripe_customer_id]), [[ORG, "cus_clean"]]);
  assertEquals(skippedFor(plan, ORG_2), {
    organization_id: ORG_2,
    reason: "metadata_conflicts_subscription",
    stripe_customer_ids: ["cus_X"],
  });
});

const orgWrites = (plan: ReturnType<typeof planStripeCustomerBackfill>) =>
  plan.orgWrites.map((row) => [row.organization_id, row.stripe_customer_id]);

Deno.test("P1 regression: org B with its own metadata customer is written it although A's subscription customer names B", () => {
  const plan = planStripeCustomerBackfill({
    ...BASE,
    organizations: [{ id: ORG, adminEmails: [] }, { id: ORG_2, adminEmails: [] }],
    subscriptions: [{ organization_id: ORG, stripe_customer_id: "cus_X" }],
    existingOrgRefs: [{ organization_id: ORG, stripe_customer_id: "cus_stored", livemode: false }],
    stripeCustomers: [
      { id: "cus_X", metadata: { organization_id: ORG_2 } },
      { id: "cus_stored" },
      { id: "cus_Y", metadata: { organization_id: ORG_2 } },
    ],
  }, true);
  assertEquals(orgWrites(plan), [[ORG_2, "cus_Y"]]);
  assertEquals(skippedFor(plan, ORG_2), undefined);
});

Deno.test("P1b regression: org B with its own admin-email customer is written it although A's subscription customer names B", () => {
  const plan = planStripeCustomerBackfill({
    ...BASE,
    organizations: [{ id: ORG, adminEmails: [] }, { id: ORG_2, adminEmails: ["b@example.test"] }],
    subscriptions: [{ organization_id: ORG, stripe_customer_id: "cus_X" }],
    existingOrgRefs: [{ organization_id: ORG, stripe_customer_id: "cus_stored", livemode: false }],
    stripeCustomers: [
      { id: "cus_X", metadata: { organization_id: ORG_2 } },
      { id: "cus_stored" },
      { id: "cus_Y", email: "B@Example.test" },
    ],
  }, true);
  assertEquals(orgWrites(plan), [[ORG_2, "cus_Y"]]);
  assertEquals(skippedFor(plan, ORG_2), undefined);
});

Deno.test("P6 regression: A already stores cus_X and B has metadata customer cus_Y, B is written cus_Y", () => {
  const plan = planStripeCustomerBackfill({
    ...BASE,
    organizations: [{ id: ORG, adminEmails: [] }, { id: ORG_2, adminEmails: [] }],
    subscriptions: [{ organization_id: ORG, stripe_customer_id: "cus_X" }],
    existingOrgRefs: [{ organization_id: ORG, stripe_customer_id: "cus_X", livemode: false }],
    stripeCustomers: [
      { id: "cus_X", metadata: { organization_id: ORG_2 } },
      { id: "cus_Y", metadata: { organization_id: ORG_2 } },
    ],
  }, true);
  assertEquals(orgWrites(plan), [[ORG_2, "cus_Y"]]);
  assertEquals(skippedFor(plan, ORG_2), undefined);
});

Deno.test("customers_claimed_elsewhere: reason, orgs_skipped_claimed counter and printed line", () => {
  const plan = planStripeCustomerBackfill({
    ...BASE,
    organizations: [{ id: ORG, adminEmails: [] }, { id: ORG_2, adminEmails: [] }],
    existingOrgRefs: [{ organization_id: ORG, stripe_customer_id: "cus_m", livemode: false }],
    stripeCustomers: [{ id: "cus_m", metadata: { organization_id: ORG_2 } }],
  }, true);
  assertEquals(skippedFor(plan, ORG_2), {
    organization_id: ORG_2,
    reason: "customers_claimed_elsewhere",
    stripe_customer_ids: ["cus_m"],
  });
  assertEquals(plan.counts.orgs_skipped_claimed, 1);
  assertEquals(plan.counts.orgs_skipped_ambiguous, 0);
  assertEquals(plan.counts.orgs_skipped_metadata_conflict, 0);
  const lines = formatBackfillPlan(plan).split("\n");
  assertEquals(lines.includes("orgs_skipped_claimed=1"), true);
  assertEquals(
    lines.includes(`org_skipped organization_id=${ORG_2} reason=customers_claimed_elsewhere stripe_customer_ids=cus_m`),
    true,
  );
});

Deno.test("invariant: every org with a metadata, email or subscription candidate is written, stored or skipped", () => {
  const O = (n: number) => `${n.toString(16).repeat(8)}-0000-4000-8000-000000000000`;
  const orgs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => ({ id: O(n), adminEmails: [`o${n}@example.test`] }));
  const snapshot: BackfillSnapshot = {
    ...BASE,
    organizations: orgs,
    subscriptions: [
      { organization_id: O(1), stripe_customer_id: "cus_s1" }, // 1 has stored ref, names 2
      { organization_id: O(3), stripe_customer_id: "cus_s3" }, // 3 clean sub, names 4
      { organization_id: O(3), stripe_customer_id: "cus_s3b" },
      { organization_id: O(5), stripe_customer_id: "cus_sh" }, // 5 and 6 share
      { organization_id: O(6), stripe_customer_id: "cus_sh" },
      { organization_id: O(10), stripe_customer_id: "cus_s10" }, // 10's customer names 11, which has its own email customer
    ],
    existingOrgRefs: [
      { organization_id: O(1), stripe_customer_id: "cus_stored1", livemode: false },
      { organization_id: O(7), stripe_customer_id: "cus_m8", livemode: false }, // 7 stores what 8's metadata names
    ],
    stripeCustomers: [
      { id: "cus_s1", metadata: { organization_id: O(2) } },
      { id: "cus_stored1" },
      { id: "cus_s3", metadata: { organization_id: O(4) } },
      { id: "cus_s3b" },
      { id: "cus_sh" },
      { id: "cus_m8", metadata: { organization_id: O(8) } },
      { id: "cus_e9", email: "o9@example.test" },
      { id: "cus_u9", email: "o9@example.test", metadata: { user_id: "user-9" } }, // a user's customer is no org candidate
      { id: "cus_s10", metadata: { organization_id: O(11) } },
      { id: "cus_e11", email: "O11@Example.test" }, // P1b shape, mixed-case email
    ],
  };
  const plan = planStripeCustomerBackfill(snapshot, true);
  const stored = new Set(snapshot.existingOrgRefs.map((row) => row.organization_id));
  const written = new Set(plan.orgWrites.map((row) => row.organization_id));
  const skipped = new Set(plan.skippedOrgs.map((row) => row.organization_id));
  for (const org of [O(2), O(4), O(8), O(5), O(6)]) {
    assertEquals(skipped.has(org), true, `org ${org} has a candidate and must be skipped`);
  }
  assertEquals(written.has(O(9)), true);
  assertEquals(written.has(O(3)), true);
  assertEquals(written.has(O(11)), true);
  const reserved = new Set([
    ...snapshot.existingOrgRefs.map((row) => row.stripe_customer_id),
    ...snapshot.subscriptions.map((row) => row.stripe_customer_id),
  ]);
  const sharedIds = new Set(
    snapshot.subscriptions.filter((row, i) =>
      snapshot.subscriptions.some((other, j) => i !== j && other.stripe_customer_id === row.stripe_customer_id)
    ).map((row) => row.stripe_customer_id),
  );
  for (const org of orgs) {
    const email = new Set(org.adminEmails.map((e) => e.toLowerCase()));
    const own = snapshot.stripeCustomers.filter((c) =>
      !reserved.has(c.id) && (
        c.metadata?.organization_id === org.id ||
        (!!c.email && email.has(c.email.toLowerCase()) && !c.metadata?.user_id && !c.metadata?.organization_id)
      )
    );
    const ownSubscription = snapshot.subscriptions
      .filter((row) =>
        row.organization_id === org.id && !sharedIds.has(row.stripe_customer_id) &&
        !snapshot.existingOrgRefs.some((ref) => ref.stripe_customer_id === row.stripe_customer_id)
      )
      .map((row) => snapshot.stripeCustomers.find((c) => c.id === row.stripe_customer_id))
      .filter((c) => c && (!c.metadata?.organization_id || c.metadata.organization_id === org.id));
    const hasUnclaimedCandidate = own.length + ownSubscription.length === 1;
    if (hasUnclaimedCandidate && !stored.has(org.id)) {
      assertEquals(written.has(org.id), true, `org ${org.id} has an unclaimed candidate and must be written`);
    }
    const hasCandidate = snapshot.subscriptions.some((row) => row.organization_id === org.id) ||
      snapshot.stripeCustomers.some((c) =>
        c.metadata?.organization_id === org.id ||
        (c.email && email.has(c.email.toLowerCase()) && !c.metadata?.user_id)
      );
    if (hasCandidate) {
      assertEquals(stored.has(org.id) || written.has(org.id) || skipped.has(org.id), true, `org ${org.id} vanished`);
    }
  }
});

Deno.test("F2: a user does not take a customer reserved by a subscription row of a pre-stored org", () => {
  const plan = planStripeCustomerBackfill({
    ...BASE,
    organizations: [{ id: ORG, adminEmails: [] }],
    users: [{ id: "user-u", email: "u@example.test" }],
    subscriptions: [{ organization_id: ORG, stripe_customer_id: "cus_U" }],
    existingOrgRefs: [{ organization_id: ORG, stripe_customer_id: "cus_stored", livemode: false }],
    stripeCustomers: [{ id: "cus_U", email: "u@example.test" }, { id: "cus_stored" }],
  }, true);
  assertEquals(plan.userWrites, []);
});

const byOrg = (a: { organization_id: string }, b: { organization_id: string }) =>
  a.organization_id.localeCompare(b.organization_id);

Deno.test("gap 1: a bare customer matched only by an admin email two orgs share skips both, in either scan order", () => {
  const orgA = { id: ORG, adminEmails: ["shared@example.test"] };
  const orgB = { id: ORG_2, adminEmails: ["Shared@Example.test"] };
  const planFor = (organizations: Array<{ id: string; adminEmails: string[] }>) => {
    const plan = planStripeCustomerBackfill({
      ...BASE,
      organizations,
      stripeCustomers: [{ id: "cus_bare", email: "shared@example.test" }],
    }, true);
    return { ...plan, skippedOrgs: [...plan.skippedOrgs].sort(byOrg) };
  };
  const ab = planFor([orgA, orgB]);
  const ba = planFor([orgB, orgA]);
  assertEquals(ab, ba);
  assertEquals(ab.orgWrites, []);
  assertEquals(ab.skippedOrgs, [
    { organization_id: ORG, reason: "ambiguous_customers", stripe_customer_ids: ["cus_bare"] },
    { organization_id: ORG_2, reason: "ambiguous_customers", stripe_customer_ids: ["cus_bare"] },
  ]);
  assertEquals(ab.counts.orgs_skipped_ambiguous, 2);
  assertEquals(ab.counts.orgs_skipped_claimed, 0);
});

Deno.test("gap 1: an already stored org does not contend for a bare email customer, and a contended one is not given to the admin as a user", () => {
  const plan = planStripeCustomerBackfill({
    ...BASE,
    organizations: [
      { id: ORG, adminEmails: ["shared@example.test"] },
      { id: ORG_2, adminEmails: ["shared@example.test"] },
      { id: ORG_3, adminEmails: ["shared@example.test"] },
    ],
    users: [{ id: "user-admin", email: "shared@example.test" }],
    existingOrgRefs: [{ organization_id: ORG_3, stripe_customer_id: "cus_stored3", livemode: false }],
    stripeCustomers: [{ id: "cus_bare", email: "shared@example.test" }, { id: "cus_stored3" }],
  }, true);
  assertEquals(plan.orgWrites, []);
  assertEquals(plan.skippedOrgs.map((row) => row.organization_id).sort(), [ORG, ORG_2]);
  assertEquals(plan.userWrites, []);
  assertEquals(plan.skippedUsers, [
    { user_id: "user-admin", reason: "customers_claimed_elsewhere", stripe_customer_ids: ["cus_bare"] },
  ]);

  const solo = planStripeCustomerBackfill({
    ...BASE,
    organizations: [{ id: ORG, adminEmails: ["shared@example.test"] }, { id: ORG_3, adminEmails: ["shared@example.test"] }],
    existingOrgRefs: [{ organization_id: ORG_3, stripe_customer_id: "cus_stored3", livemode: false }],
    stripeCustomers: [{ id: "cus_bare", email: "shared@example.test" }, { id: "cus_stored3" }],
  }, true);
  assertEquals(orgWrites(solo), [[ORG, "cus_bare"]]);
});

Deno.test("gap 1: an org written its own metadata customer still makes a bare customer on its admin email ambiguous for the other org", () => {
  for (const order of [[0, 1], [1, 0]]) {
    const orgs = [{ id: ORG, adminEmails: ["shared@example.test"] }, { id: ORG_2, adminEmails: ["shared@example.test"] }];
    const plan = planStripeCustomerBackfill({
      ...BASE,
      organizations: order.map((i) => orgs[i]),
      stripeCustomers: [
        { id: "cus_meta", email: "shared@example.test", metadata: { organization_id: ORG } },
        { id: "cus_bare", email: "shared@example.test" },
      ],
    }, true);
    assertEquals(orgWrites(plan), [[ORG, "cus_meta"]]);
    assertEquals(plan.skippedOrgs, [
      { organization_id: ORG_2, reason: "ambiguous_customers", stripe_customer_ids: ["cus_bare"] },
    ]);
  }
});

const USER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const planUsers = (snapshot: Partial<BackfillSnapshot>) =>
  planStripeCustomerBackfill({ ...BASE, ...snapshot }, true);

Deno.test("U7: two metadata customers are tie-broken by the user's email, else the user is skipped and reported", () => {
  const customers: BackfillStripeCustomer[] = [
    { id: "cus_u1", email: "old@example.test", metadata: { user_id: USER } },
    { id: "cus_u2", email: "Now@Example.test", metadata: { user_id: USER } },
  ];
  const broken = planUsers({ users: [{ id: USER, email: "now@example.test" }], stripeCustomers: customers });
  assertEquals(broken.userWrites.map((row) => row.stripe_customer_id), ["cus_u2"]);
  assertEquals(broken.skippedUsers, []);

  const tied = planUsers({ users: [{ id: USER, email: "other@example.test" }], stripeCustomers: customers });
  assertEquals(tied.userWrites, []);
  assertEquals(tied.skippedUsers, [
    { user_id: USER, reason: "ambiguous_customers", stripe_customer_ids: ["cus_u1", "cus_u2"] },
  ]);
  assertEquals(tied.counts.users_skipped_ambiguous, 1);
  assertEquals(
    formatBackfillPlan(tied).split("\n").includes(
      `user_skipped user_id=${USER} reason=ambiguous_customers stripe_customer_ids=cus_u1,cus_u2`,
    ),
    true,
  );
});

Deno.test("U8: a user whose own metadata customer another owner holds is reported as customers_claimed_elsewhere", () => {
  const plan = planUsers({
    organizations: [],
    users: [{ id: USER, email: "u@example.test" }, { id: USER_2, email: "v@example.test" }],
    existingOrgRefs: [{ organization_id: ORG, stripe_customer_id: "cus_u", livemode: false }],
    existingUserRefs: [{ user_id: "someone-else", stripe_customer_id: "cus_v", livemode: false }],
    stripeCustomers: [
      { id: "cus_u", email: "other@example.test", metadata: { user_id: USER } },
      { id: "cus_v", email: "v@example.test" },
    ],
  });
  assertEquals(plan.userWrites, []);
  assertEquals(plan.skippedUsers, [
    { user_id: USER, reason: "customers_claimed_elsewhere", stripe_customer_ids: ["cus_u"] },
    { user_id: USER_2, reason: "customers_claimed_elsewhere", stripe_customer_ids: ["cus_v"] },
  ]);
  assertEquals(plan.counts.users_skipped_claimed, 2);
  assertEquals(formatBackfillPlan(plan).split("\n").includes("users_skipped_claimed=2"), true);
});

Deno.test("a user whose email is only on another user's metadata customer is neither written nor skipped", () => {
  const plan = planUsers({
    users: [{ id: USER, email: "u@example.test" }, { id: USER_2, email: "v@example.test" }],
    stripeCustomers: [{ id: "cus_v", email: "U@example.test", metadata: { user_id: USER_2 } }],
  });
  assertEquals(plan.userWrites.map((row) => [row.user_id, row.stripe_customer_id]), [[USER_2, "cus_v"]]);
  assertEquals(plan.skippedUsers, []);
  assertEquals(plan.counts.users_skipped_claimed, 0);
});

Deno.test("U5: several bare customers with the user's email name the user and the customer ids", () => {
  const plan = planUsers({
    users: [{ id: USER, email: "u@example.test" }],
    stripeCustomers: [{ id: "cus_e1", email: "u@example.test" }, { id: "cus_e2", email: "U@example.test" }],
  });
  assertEquals(plan.userWrites, []);
  assertEquals(plan.skippedUsers, [
    { user_id: USER, reason: "ambiguous_customers", stripe_customer_ids: ["cus_e1", "cus_e2"] },
  ]);
  assertEquals(plan.counts.users_skipped_ambiguous, 1);
  assertEquals(
    formatBackfillPlan(plan).split("\n").includes(
      `user_skipped user_id=${USER} reason=ambiguous_customers stripe_customer_ids=cus_e1,cus_e2`,
    ),
    true,
  );
});

Deno.test("invariant: every user with a metadata or bare email candidate is written, stored or skipped", () => {
  const U = (n: number) => `${n.toString(16).repeat(8)}-0000-4000-8000-00000000000u`;
  const users = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ id: U(n), email: `u${n}@example.test` }));
  const snapshot: BackfillSnapshot = {
    ...BASE,
    organizations: [{ id: ORG, adminEmails: ["u7@example.test"] }, { id: ORG_2, adminEmails: ["u7@example.test"] }],
    users,
    subscriptions: [{ organization_id: ORG_3, stripe_customer_id: "cus_s6" }], // 6's email customer is reserved
    existingOrgRefs: [{ organization_id: ORG_3, stripe_customer_id: "cus_m4", livemode: false }], // 4's metadata customer is held
    existingUserRefs: [{ user_id: U(9), stripe_customer_id: "cus_stored9", livemode: false }],
    stripeCustomers: [
      { id: "cus_m1", email: "old1@example.test", metadata: { user_id: U(1) } }, // written by metadata
      { id: "cus_m2a", email: "x@example.test", metadata: { user_id: U(2) } }, // U7: tied
      { id: "cus_m2b", email: "y@example.test", metadata: { user_id: U(2) } },
      { id: "cus_e3a", email: "u3@example.test" }, // U5: two bare email customers
      { id: "cus_e3b", email: "U3@Example.test" },
      { id: "cus_m4", metadata: { user_id: U(4) } }, // U8
      { id: "cus_e5", email: "U5@example.test" }, // written by email
      { id: "cus_s6", email: "u6@example.test" },
      { id: "cus_e7", email: "u7@example.test" }, // contended by two orgs: left for a human
      { id: "cus_o8", email: "u8@example.test", metadata: { organization_id: ORG } }, // an org's customer is no user candidate
      { id: "cus_stored9", email: "u9@example.test" },
    ],
  };
  const plan = planStripeCustomerBackfill(snapshot, true);
  const stored = new Set(snapshot.existingUserRefs.map((row) => row.user_id));
  const written = new Set(plan.userWrites.map((row) => row.user_id));
  const skipped = new Set(plan.skippedUsers.map((row) => row.user_id));
  assertEquals([...written].sort(), [U(1), U(5)].sort());
  assertEquals([...skipped].sort(), [U(2), U(3), U(4), U(6), U(7)].sort());
  for (const user of users) {
    const hasCandidate = snapshot.stripeCustomers.some((c) =>
      !c.metadata?.organization_id && (
        c.metadata?.user_id === user.id ||
        (!c.metadata?.user_id && (c.email ?? "").toLowerCase() === user.email.toLowerCase())
      )
    );
    if (hasCandidate) {
      assertEquals(stored.has(user.id) || written.has(user.id) || skipped.has(user.id), true, `user ${user.id} vanished`);
    }
    assertEquals(written.has(user.id) && skipped.has(user.id), false, `user ${user.id} written and skipped`);
  }
});

Deno.test("gap 3: an org whose buyer changed email is loaded by metadata search and gets its metadata customer", async () => {
  const searched: string[] = [];
  const source = {
    listByEmail: () => Promise.resolve([] as BackfillStripeCustomer[]),
    searchByOrganizationId: (organizationId: string) => {
      searched.push(organizationId);
      return Promise.resolve(organizationId === ORG
        ? [
          { id: "cus_old", email: "former@example.test", livemode: false, metadata: { organization_id: ORG } },
          { id: "cus_live", livemode: true, metadata: { organization_id: ORG } },
          { id: "cus_gone", livemode: false, deleted: true, metadata: { organization_id: ORG } },
        ]
        : []);
    },
    retrieve: () => Promise.resolve(null),
  };
  const organizations = [{ id: ORG, adminEmails: ["current@example.test"] }, { id: ORG_2, adminEmails: [] }];
  const stripeCustomers = await loadStripeCustomers(source, {
    emails: ["current@example.test"],
    customerIds: [],
    organizationIds: organizations.map((org) => org.id),
    livemode: false,
  });
  assertEquals(searched, [ORG, ORG_2]);
  assertEquals(stripeCustomers.map((customer) => customer.id), ["cus_old"]);

  const plan = planStripeCustomerBackfill({ ...BASE, organizations, stripeCustomers }, true);
  assertEquals(orgWrites(plan), [[ORG, "cus_old"]]);
});

Deno.test("gap 3: the Stripe source searches metadata['organization_id'] and follows next_page", async () => {
  const requests: URL[] = [];
  const pages: Record<string, unknown> = {
    first: {
      data: [{ id: "cus_1", email: "gone@example.test", livemode: false, metadata: { organization_id: ORG } }],
      has_more: true,
      next_page: "page_2",
    },
    page_2: {
      data: [{ id: "cus_2", email: null, livemode: false, metadata: { organization_id: ORG } }],
      has_more: false,
      next_page: null,
    },
  };
  const fetchUrl = (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    requests.push(url);
    assertEquals(new Headers(init?.headers).get("Authorization"), "Bearer sk_test_x");
    return Promise.resolve(Response.json(pages[url.searchParams.get("page") ?? "first"]));
  };
  const customers = await stripeApiSource("sk_test_x", fetchUrl as typeof fetch).searchByOrganizationId(ORG);
  assertEquals(customers.map((customer) => customer.id), ["cus_1", "cus_2"]);
  assertEquals(requests.map((url) => url.pathname), ["/v1/customers/search", "/v1/customers/search"]);
  assertEquals(requests[0].searchParams.get("query"), `metadata['organization_id']:'${ORG}'`);
  assertEquals(requests.map((url) => url.searchParams.get("page")), [null, "page_2"]);
  assertEquals(requests[0].searchParams.get("limit"), "100");

  await stripeApiSource("sk_test_x", fetchUrl as typeof fetch).searchByOrganizationId("o'rg");
  assertEquals(requests[2].searchParams.get("query"), "metadata['organization_id']:'o\\'rg'");
});

Deno.test("the Stripe source escapes a backslash before the quote in the metadata search", async () => {
  const queries: Array<string | null> = [];
  const fetchUrl = (input: string | URL | Request) => {
    queries.push(new URL(String(input)).searchParams.get("query"));
    return Promise.resolve(Response.json({ data: [], has_more: false, next_page: null }));
  };
  await stripeApiSource("sk_test_x", fetchUrl as typeof fetch).searchByOrganizationId("o\\'rg");
  assertEquals(queries, [String.raw`metadata['organization_id']:'o\\\'rg'`]);
});
