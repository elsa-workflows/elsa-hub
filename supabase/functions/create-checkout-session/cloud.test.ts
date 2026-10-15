import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleCloudCheckout } from "./cloud.ts";
import type { StripeCustomerOwner } from "../_shared/stripe-customer.ts";

function jsonUserClient(isAdmin = true) {
  return {
    rpc: (_name: string, _args: unknown) => Promise.resolve({ data: isAdmin, error: null }),
    from() {
      const query = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        maybeSingle() {
          return Promise.resolve({ data: { name: "Org B" }, error: null });
        },
      };
      return query;
    },
  };
}

function jsonServiceClient() {
  return {
    from() {
      const query = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        maybeSingle() {
          return Promise.resolve({ data: null, error: null });
        },
      };
      return query;
    },
  };
}

Deno.test("Cloud checkout rejects personal mode with 4xx", async () => {
  let createdCustomers = 0;
  const response = await handleCloudCheckout({
    req: new Request("https://elsa-hub.example/functions/v1/create-checkout-session", {
      method: "POST",
      headers: { origin: "https://elsa-hub.example" },
    }),
    user: { id: "admin-1", email: "admin@example.test" },
    userClient: jsonUserClient() as never,
    serviceClient: jsonServiceClient() as never,
    body: { productType: "cloud" } as never,
    corsHeaders: {},
    env: {
      get(key: string) {
        if (key === "STRIPE_SECRET_KEY") return "sk_test_cloud";
        if (key === "STRIPE_CLOUD_PRICE_ID") return "price_test_cloud";
        return undefined;
      },
    },
    getOrCreateStripeCustomer: async () => {
      createdCustomers += 1;
      return "cus_should_not_exist";
    },
  });

  assertEquals(response.status, 400);
  const payload = await response.json();
  assertEquals(payload.error, "Cloud checkout requires an organization");
  assertEquals(createdCustomers, 0);
});

Deno.test("Cloud checkout ignores a client-supplied Control organization id", async () => {
  const owners: StripeCustomerOwner[] = [];
  let sessionParams: Record<string, unknown> | undefined;

  const response = await handleCloudCheckout({
    req: new Request("https://elsa-hub.example/functions/v1/create-checkout-session", {
      method: "POST",
      headers: { origin: "https://elsa-hub.example" },
    }),
    user: { id: "admin-1", email: "admin@example.test" },
    userClient: jsonUserClient() as never,
    serviceClient: jsonServiceClient() as never,
    body: {
      organizationId: "org-b",
      controlOrganizationId: "attacker-control-org",
    },
    corsHeaders: {},
    env: {
      get(key: string) {
        if (key === "STRIPE_SECRET_KEY") return "sk_test_cloud";
        if (key === "STRIPE_CLOUD_PRICE_ID") return "price_test_cloud";
        return undefined;
      },
    },
    getOrCreateStripeCustomer: async (owner) => {
      owners.push(owner);
      return "cus_org_b";
    },
    stripe: {
      customers: {
        create: () => {
          throw new Error("must not look up or create via email");
        },
        update: async (id) => ({ id }),
        del: async (id) => ({ id }),
      },
      subscriptions: {
        list: async () => ({ data: [] }),
      },
      checkout: {
        sessions: {
          create: (params) => {
            sessionParams = params as unknown as Record<string, unknown>;
            return Promise.resolve({ url: "https://checkout.example/session" });
          },
        },
      },
    },
  });

  assertEquals(response.status, 200);
  assertEquals(owners, [{ orgId: "org-b" }]);
  assertEquals(sessionParams?.client_reference_id, "org-b");
  const metadata = sessionParams?.metadata as Record<string, string>;
  const subscriptionData = sessionParams?.subscription_data as {
    metadata: Record<string, string>;
  };
  assertEquals(metadata.elsa_control_organization_id, "org-b");
  assertEquals(metadata.hub_organization_id, "org-b");
  assertEquals(subscriptionData.metadata.elsa_control_organization_id, "org-b");
  assertEquals(subscriptionData.metadata.elsa_control_organization_id === "attacker-control-org", false);
});

function checkoutStripe(listData: Array<{ id: string; status: string; metadata?: Record<string, string> }>) {
  let createdSessions = 0;
  return {
    createdSessions: () => createdSessions,
    stripe: {
      customers: {
        create: () => {
          throw new Error("must not look up or create via email");
        },
        update: async (id: string) => ({ id }),
        del: async (id: string) => ({ id }),
      },
      subscriptions: {
        list: async () => ({ data: listData }),
      },
      checkout: {
        sessions: {
          create: () => {
            createdSessions += 1;
            return Promise.resolve({ url: "https://checkout.example/session" });
          },
        },
      },
    },
  };
}

Deno.test("Cloud checkout returns 409 when the org already has an active Cloud subscription", async () => {
  const mock = checkoutStripe([
    { id: "sub_cloud", status: "active", metadata: { kind: "cloud", product_type: "cloud" } },
  ]);

  const response = await handleCloudCheckout({
    req: new Request("https://elsa-hub.example/functions/v1/create-checkout-session", {
      method: "POST",
      headers: { origin: "https://elsa-hub.example" },
    }),
    user: { id: "admin-1", email: "admin@example.test" },
    userClient: jsonUserClient() as never,
    serviceClient: jsonServiceClient() as never,
    body: { organizationId: "org-b" },
    corsHeaders: {},
    env: {
      get(key: string) {
        if (key === "STRIPE_SECRET_KEY") return "sk_test_cloud";
        if (key === "STRIPE_CLOUD_PRICE_ID") return "price_test_cloud";
        return undefined;
      },
    },
    getOrCreateStripeCustomer: async () => "cus_org_b",
    stripe: mock.stripe,
  });

  assertEquals(response.status, 409);
  const payload = await response.json();
  assertEquals(payload.code, "cloud_subscription_exists");
  assertEquals(payload.error, "This organization already has an active Cloud subscription");
  assertEquals(mock.createdSessions(), 0);
});

Deno.test("Cloud checkout allows a new session when the org only has Hub or canceled Cloud subscriptions", async () => {
  const mock = checkoutStripe([
    { id: "sub_hub", status: "active", metadata: { billing_type: "recurring" } },
    { id: "sub_old_cloud", status: "canceled", metadata: { kind: "cloud" } },
  ]);

  const response = await handleCloudCheckout({
    req: new Request("https://elsa-hub.example/functions/v1/create-checkout-session", {
      method: "POST",
      headers: { origin: "https://elsa-hub.example" },
    }),
    user: { id: "admin-1", email: "admin@example.test" },
    userClient: jsonUserClient() as never,
    serviceClient: jsonServiceClient() as never,
    body: { organizationId: "org-b" },
    corsHeaders: {},
    env: {
      get(key: string) {
        if (key === "STRIPE_SECRET_KEY") return "sk_test_cloud";
        if (key === "STRIPE_CLOUD_PRICE_ID") return "price_test_cloud";
        return undefined;
      },
    },
    getOrCreateStripeCustomer: async () => "cus_org_b",
    stripe: mock.stripe,
  });

  assertEquals(response.status, 200);
  assertEquals(mock.createdSessions(), 1);
});
