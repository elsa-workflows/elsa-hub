import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleCloudCheckout } from "./cloud.ts";
import type { StripeCustomerOwner } from "../_shared/stripe-customer.ts";

const LINKED_CONTROL_ORG_ID = "control-org-b";
const VALIDATED_LINK = {
  hub_organization_id: "org-b",
  control_organization_id: LINKED_CONTROL_ORG_ID,
  validated_at: "2026-10-16T00:00:00.000Z",
};

function jsonUserClient(options?: {
  isAdmin?: boolean;
  memberships?: Array<{ organization_id: string; role: string }>;
  controlLink?: {
    hub_organization_id: string;
    control_organization_id: string;
    validated_at: string | null;
  } | null;
}) {
  const isAdmin = options?.isAdmin ?? true;
  const memberships = options?.memberships ?? [{ organization_id: "org-b", role: "admin" }];
  const controlLink = options?.controlLink === undefined ? VALIDATED_LINK : options.controlLink;
  return {
    rpc: (_name: string, args: { p_org_id?: string }) => {
      const orgId = args?.p_org_id;
      const allowed = memberships.some(
        (row) =>
          row.organization_id === orgId && (row.role === "admin" || row.role === "owner"),
      );
      return Promise.resolve({ data: isAdmin && allowed, error: null });
    },
    from(table: string) {
      if (table === "cloud_organization_links") {
        let hubOrganizationId: string | undefined;
        const query = {
          select() {
            return query;
          },
          eq(column: string, value: string) {
            if (column === "hub_organization_id") hubOrganizationId = value;
            return query;
          },
          maybeSingle() {
            const matches = controlLink &&
              (hubOrganizationId === undefined ||
                controlLink.hub_organization_id === hubOrganizationId);
            return Promise.resolve({
              data: matches ? controlLink : null,
              error: null,
            });
          },
        };
        return query;
      }
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
      controlOrganizationId: "foreign-control-org",
    } as never,
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
  assertEquals(sessionParams?.client_reference_id, LINKED_CONTROL_ORG_ID);
  const metadata = sessionParams?.metadata as Record<string, string>;
  const subscriptionData = sessionParams?.subscription_data as {
    metadata: Record<string, string>;
  };
  assertEquals(metadata.elsa_control_organization_id, LINKED_CONTROL_ORG_ID);
  assertEquals(metadata.hub_organization_id, "org-b");
  assertEquals(subscriptionData.metadata.elsa_control_organization_id, LINKED_CONTROL_ORG_ID);
  assertEquals(metadata.elsa_control_organization_id === "org-b", false);
  assertEquals(metadata.elsa_control_organization_id === "foreign-control-org", false);
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

Deno.test("client-supplied foreign org id is never written to Stripe metadata", async () => {
  let createdSessions = 0;
  let sessionParams: Record<string, unknown> | undefined;

  const response = await handleCloudCheckout({
    req: new Request("https://elsa-hub.example/functions/v1/create-checkout-session", {
      method: "POST",
      headers: { origin: "https://elsa-hub.example" },
    }),
    user: { id: "admin-1", email: "admin@example.test" },
    userClient: jsonUserClient({
      memberships: [{ organization_id: "org-b", role: "admin" }],
    }) as never,
    serviceClient: jsonServiceClient() as never,
    body: {
      organizationId: "org-foreign",
      controlOrganizationId: "org-foreign",
    } as never,
    corsHeaders: {},
    env: {
      get(key: string) {
        if (key === "STRIPE_SECRET_KEY") return "sk_test_cloud";
        if (key === "STRIPE_CLOUD_PRICE_ID") return "price_test_cloud";
        return undefined;
      },
    },
    getOrCreateStripeCustomer: async () => "cus_should_not_exist",
    stripe: {
      customers: {
        create: () => {
          throw new Error("must not create");
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
            createdSessions += 1;
            sessionParams = params as unknown as Record<string, unknown>;
            return Promise.resolve({ url: "https://checkout.example/session" });
          },
        },
      },
    },
  });

  assertEquals(response.status, 403);
  const payload = await response.json();
  assertEquals(payload.code, "cloud_org_not_linked");
  assertEquals(createdSessions, 0);
  assertEquals(sessionParams, undefined);
});

Deno.test("a linked org uses the Control organization id from the link record", async () => {
  let sessionParams: Record<string, unknown> | undefined;

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
  const metadata = sessionParams?.metadata as Record<string, string>;
  assertEquals(sessionParams?.client_reference_id, LINKED_CONTROL_ORG_ID);
  assertEquals(metadata.elsa_control_organization_id, LINKED_CONTROL_ORG_ID);
  assertEquals(metadata.hub_organization_id, "org-b");
  assertEquals(metadata.elsa_control_organization_id === "org-b", false);
});

Deno.test("an unlinked org gets a 403 with cloud_org_not_linked", async () => {
  let createdSessions = 0;

  const response = await handleCloudCheckout({
    req: new Request("https://elsa-hub.example/functions/v1/create-checkout-session", {
      method: "POST",
      headers: { origin: "https://elsa-hub.example" },
    }),
    user: { id: "user-unlinked", email: "unlinked@example.test" },
    userClient: jsonUserClient({
      memberships: [{ organization_id: "org-b", role: "member" }],
      isAdmin: false,
      controlLink: null,
    }) as never,
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
    getOrCreateStripeCustomer: async () => "cus_should_not_exist",
    stripe: {
      customers: {
        create: () => {
          throw new Error("must not create");
        },
        update: async (id) => ({ id }),
        del: async (id) => ({ id }),
      },
      subscriptions: {
        list: async () => ({ data: [] }),
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
  });

  assertEquals(response.status, 403);
  const payload = await response.json();
  assertEquals(payload.code, "cloud_org_not_linked");
  assertEquals(createdSessions, 0);
});

Deno.test("an admin of an unlinked org gets a 403 with cloud_org_not_linked", async () => {
  let createdSessions = 0;

  const response = await handleCloudCheckout({
    req: new Request("https://elsa-hub.example/functions/v1/create-checkout-session", {
      method: "POST",
      headers: { origin: "https://elsa-hub.example" },
    }),
    user: { id: "admin-unlinked", email: "admin-unlinked@example.test" },
    userClient: jsonUserClient({
      memberships: [{ organization_id: "org-b", role: "admin" }],
      isAdmin: true,
      controlLink: null,
    }) as never,
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
    getOrCreateStripeCustomer: async () => "cus_should_not_exist",
    stripe: {
      customers: {
        create: () => {
          throw new Error("must not create");
        },
        update: async (id) => ({ id }),
        del: async (id) => ({ id }),
      },
      subscriptions: {
        list: async () => ({ data: [] }),
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
  });

  assertEquals(response.status, 403);
  const payload = await response.json();
  assertEquals(payload.code, "cloud_org_not_linked");
  assertEquals(createdSessions, 0);
});
