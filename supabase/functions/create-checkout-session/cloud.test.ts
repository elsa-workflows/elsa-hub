import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleCloudCheckout } from "./cloud.ts";
import type { StripeCustomerOwner } from "../_shared/stripe-customer.ts";

const HUB_ORG = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const FOREIGN_ORG = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CONTROL_ORG = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const OTHER_CONTROL = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function jsonUserClient(options?: {
  isAdmin?: boolean;
  memberships?: Array<{ organization_id: string; role: string }>;
}) {
  const isAdmin = options?.isAdmin ?? true;
  const memberships = options?.memberships ?? [{ organization_id: HUB_ORG, role: "admin" }];
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
      if (table === "organization_members") {
        const query = {
          select() {
            return query;
          },
          eq() {
            return Promise.resolve({ data: memberships, error: null });
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

function jsonServiceClient(options?: {
  links?: Array<{
    hub_organization_id: string;
    control_organization_id: string | null;
    validated_at: string | null;
  }>;
  linkError?: string;
}) {
  return {
    from(table: string) {
      let selectedHub: string | undefined;
      const query = {
        select() {
          return query;
        },
        eq(column: string, value: string) {
          if (table === "cloud_organization_links" && column === "hub_organization_id") {
            selectedHub = value;
          }
          return query;
        },
        maybeSingle() {
          if (table === "cloud_organization_links") {
            if (options?.linkError) {
              return Promise.resolve({ data: null, error: { message: options.linkError } });
            }
            const found = (options?.links ?? []).find((row) => row.hub_organization_id === selectedHub);
            return Promise.resolve({ data: found ?? null, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
      };
      return query;
    },
  };
}

function linkedOrgServiceClient(controlOrganizationId = CONTROL_ORG) {
  return jsonServiceClient({
    links: [{
      hub_organization_id: HUB_ORG,
      control_organization_id: controlOrganizationId,
      validated_at: "2026-10-16T00:00:00.000Z",
    }],
  });
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
    serviceClient: linkedOrgServiceClient("cccccccc-cccc-4ccc-8ccc-cccccccccccc") as never,
    body: {
      organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      controlOrganizationId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
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
  assertEquals(owners, [{ orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }]);
  assertEquals(sessionParams?.client_reference_id, "cccccccc-cccc-4ccc-8ccc-cccccccccccc");
  const metadata = sessionParams?.metadata as Record<string, string>;
  const subscriptionData = sessionParams?.subscription_data as {
    metadata: Record<string, string>;
  };
  assertEquals(metadata.elsa_control_organization_id, "cccccccc-cccc-4ccc-8ccc-cccccccccccc");
  assertEquals(metadata.hub_organization_id, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  assertEquals(subscriptionData.metadata.elsa_control_organization_id, "cccccccc-cccc-4ccc-8ccc-cccccccccccc");
  assertEquals(metadata.elsa_control_organization_id === "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", false);
  assertEquals(metadata.elsa_control_organization_id === "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", false);
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
    serviceClient: linkedOrgServiceClient() as never,
    body: { organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
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
    serviceClient: linkedOrgServiceClient() as never,
    body: { organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
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
      memberships: [{ organization_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", role: "admin" }],
    }) as never,
    serviceClient: jsonServiceClient() as never,
    body: {
      organizationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      controlOrganizationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
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

Deno.test("Cloud checkout returns an error when the user has no organization link", async () => {
  let createdSessions = 0;

  const response = await handleCloudCheckout({
    req: new Request("https://elsa-hub.example/functions/v1/create-checkout-session", {
      method: "POST",
      headers: { origin: "https://elsa-hub.example" },
    }),
    user: { id: "user-unlinked", email: "unlinked@example.test" },
    userClient: jsonUserClient({ memberships: [] }) as never,
    serviceClient: jsonServiceClient() as never,
    body: { organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
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

Deno.test("a linked org writes the Control organization id, not the Hub org id", async () => {
  let sessionParams: Record<string, unknown> | undefined;
  let createdCustomers = 0;

  const response = await handleCloudCheckout({
    req: new Request("https://elsa-hub.example/functions/v1/create-checkout-session", {
      method: "POST",
      headers: { origin: "https://elsa-hub.example" },
    }),
    user: { id: "admin-1", email: "admin@example.test" },
    userClient: jsonUserClient() as never,
    serviceClient: linkedOrgServiceClient("dddddddd-dddd-4ddd-8ddd-dddddddddddd") as never,
    body: { organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
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
  assertEquals(createdCustomers, 1);
  const metadata = sessionParams?.metadata as Record<string, string>;
  assertEquals(metadata.elsa_control_organization_id, "dddddddd-dddd-4ddd-8ddd-dddddddddddd");
  assertEquals(metadata.hub_organization_id, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  assertEquals(sessionParams?.client_reference_id, "dddddddd-dddd-4ddd-8ddd-dddddddddddd");
});

Deno.test("an unlinked org gets 403 cloud_org_not_linked and no session", async () => {
  let createdSessions = 0;
  let createdCustomers = 0;

  const response = await handleCloudCheckout({
    req: new Request("https://elsa-hub.example/functions/v1/create-checkout-session", {
      method: "POST",
      headers: { origin: "https://elsa-hub.example" },
    }),
    user: { id: "admin-1", email: "admin@example.test" },
    userClient: jsonUserClient() as never,
    serviceClient: jsonServiceClient() as never,
    body: { organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
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
  assertEquals(createdCustomers, 0);
});

Deno.test("an org admin of an unlinked org gets 403 and no session", async () => {
  let createdSessions = 0;
  let createdCustomers = 0;

  const response = await handleCloudCheckout({
    req: new Request("https://elsa-hub.example/functions/v1/create-checkout-session", {
      method: "POST",
      headers: { origin: "https://elsa-hub.example" },
    }),
    user: { id: "admin-1", email: "admin@example.test" },
    userClient: jsonUserClient({
      isAdmin: true,
      memberships: [{ organization_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", role: "admin" }],
    }) as never,
    serviceClient: jsonServiceClient() as never,
    body: { organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
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
  assertEquals(createdCustomers, 0);
});

Deno.test("a link row without validated_at is 403 cloud_org_not_linked and creates no session", async () => {
  let createdSessions = 0;
  let createdCustomers = 0;

  const response = await handleCloudCheckout({
    req: new Request("https://elsa-hub.example/functions/v1/create-checkout-session", {
      method: "POST",
      headers: { origin: "https://elsa-hub.example" },
    }),
    user: { id: "admin-1", email: "admin@example.test" },
    userClient: jsonUserClient() as never,
    serviceClient: jsonServiceClient({
      links: [{
        hub_organization_id: HUB_ORG,
        control_organization_id: CONTROL_ORG,
        validated_at: null,
      }],
    }) as never,
    body: { organizationId: HUB_ORG },
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
  assertEquals(createdCustomers, 0);
});

Deno.test("Cloud checkout calls #79's reader, not an injected stub", async () => {
  const source = await Deno.readTextFile(new URL("./cloud.ts", import.meta.url));
  assertEquals(source.includes('from "../_shared/cloud-organization-link.ts"'), true);
  assertEquals(source.includes("readValidatedControlOrganizationId"), true);
  assertEquals(source.includes("readControlOrganizationId?:"), false);
  assertEquals(source.includes("async function readValidatedControlOrganizationId"), false);
});

Deno.test("a Control organization link read error is 500 and creates no session", async () => {
  let createdSessions = 0;
  let createdCustomers = 0;

  const response = await handleCloudCheckout({
    req: new Request("https://elsa-hub.example/functions/v1/create-checkout-session", {
      method: "POST",
      headers: { origin: "https://elsa-hub.example" },
    }),
    user: { id: "admin-1", email: "admin@example.test" },
    userClient: jsonUserClient() as never,
    serviceClient: jsonServiceClient({ linkError: "connection refused" }) as never,
    body: { organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
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

  assertEquals(response.status, 500);
  const errorPayload = await response.json();
  assertEquals(errorPayload.error, "Failed to read Control organization link: connection refused");
  assertEquals(createdSessions, 0);
  assertEquals(createdCustomers, 0);
});
