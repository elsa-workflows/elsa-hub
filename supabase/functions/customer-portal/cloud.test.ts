import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleCloudPortal } from "./cloud.ts";

type StoredRow = { ownerId: string; stripeCustomerId: string };

function createStore(seed: { org?: StoredRow[]; user?: StoredRow[] }) {
  const orgRows = [...(seed.org ?? [])];
  const userRows = [...(seed.user ?? [])];
  return {
    from(table: string) {
      let selectedOwner: string | undefined;
      const rows = table === "org_stripe_customers" ? orgRows : userRows;
      const ownerKey = table === "org_stripe_customers" ? "organization_id" : "user_id";
      const query = {
        select() {
          return query;
        },
        eq(column: string, value: string) {
          if (column === ownerKey) selectedOwner = value;
          return query;
        },
        maybeSingle() {
          const found = rows.find((row) => row.ownerId === selectedOwner);
          return Promise.resolve({
            data: found ? { stripe_customer_id: found.stripeCustomerId } : null,
            error: null,
          });
        },
      };
      return query;
    },
  };
}

function adminClient(isAdmin = true) {
  return {
    rpc: () => Promise.resolve({ data: isAdmin, error: null }),
  };
}

Deno.test("org B portal never opens org A's customer or the admin's personal customer", async () => {
  const opened: string[] = [];
  const response = await handleCloudPortal({
    req: new Request("https://elsa-hub.example/functions/v1/customer-portal", {
      method: "POST",
      headers: { origin: "https://elsa-hub.example" },
    }),
    user: { id: "admin-1", email: "admin@example.test" },
    userClient: adminClient() as never,
    serviceClient: createStore({
      org: [
        { ownerId: "org-a", stripeCustomerId: "cus_org_a" },
        { ownerId: "org-b", stripeCustomerId: "cus_org_b" },
      ],
      user: [{ ownerId: "admin-1", stripeCustomerId: "cus_admin_personal" }],
    }) as never,
    body: { organizationId: "org-b" },
    corsHeaders: {},
    env: {
      get(key: string) {
        if (key === "STRIPE_SECRET_KEY") return "sk_test_cloud";
        return undefined;
      },
    },
    stripe: {
      billingPortal: {
        sessions: {
          create: (params) => {
            opened.push(params.customer);
            return Promise.resolve({ url: "https://billing.example/org-b" });
          },
        },
      },
    },
  });

  assertEquals(response.status, 200);
  assertEquals(opened, ["cus_org_b"]);
});

Deno.test("personal Cloud portal opens only the caller's stored user customer", async () => {
  const opened: string[] = [];
  const response = await handleCloudPortal({
    req: new Request("https://elsa-hub.example/functions/v1/customer-portal", {
      method: "POST",
      headers: { origin: "https://elsa-hub.example" },
    }),
    user: { id: "admin-1", email: "admin@example.test" },
    userClient: adminClient() as never,
    serviceClient: createStore({
      org: [{ ownerId: "org-a", stripeCustomerId: "cus_org_a" }],
      user: [{ ownerId: "admin-1", stripeCustomerId: "cus_admin_personal" }],
    }) as never,
    body: {},
    corsHeaders: {},
    env: {
      get(key: string) {
        if (key === "STRIPE_SECRET_KEY") return "sk_test_cloud";
        return undefined;
      },
    },
    stripe: {
      billingPortal: {
        sessions: {
          create: (params) => {
            opened.push(params.customer);
            return Promise.resolve({ url: "https://billing.example/personal" });
          },
        },
      },
    },
  });

  assertEquals(response.status, 200);
  assertEquals(opened, ["cus_admin_personal"]);
});
