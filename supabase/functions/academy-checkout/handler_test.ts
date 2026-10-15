import { assertEquals, assertExists } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { handleAcademyCheckoutRequest, runAcademyCheckout } from "./handler.ts";
import { resolveCustomer } from "./stripeCustomer.ts";

const SOLO_COURSE = {
  id: "00000000-0000-4000-8000-000000002001",
  slug: "published-course",
  title: "Published Course",
  product_code: "solo_bundle",
  stripe_price_id: "price_solo_test",
  price_cents: 2900,
  currency: "eur",
};

const TEAM5_COURSE = {
  id: "00000000-0000-4000-8000-000000002005",
  slug: "team-five",
  title: "Team 5",
  product_code: "team_5",
  stripe_price_id: "price_team5_test",
  price_cents: 9900,
  currency: "eur",
};

const TEAM10_COURSE = {
  ...TEAM5_COURSE,
  id: "00000000-0000-4000-8000-000000002010",
  slug: "team-ten",
  title: "Team 10",
  product_code: "team_10",
  stripe_price_id: "price_team10_test",
};

const USER = {
  id: "00000000-0000-4000-8000-000000000002",
  email: "buyer@example.com",
};

const ORG_ID = "00000000-0000-4000-8000-000000001001";

const BILLING_PROFILE = {
  company_legal_name: "Academy Org BV",
  address_line1: "Keizersgracht 1",
  city: "Amsterdam",
  postal_code: "1015 AA",
  country: "NL",
  vat_number: "NL123456789B01",
  registration_number: "12345678",
};

type SessionCreate = Record<string, unknown>;

function createStripeMock(options?: {
  existingCustomerId?: string;
  createdIds?: string[];
}) {
  const sessions: SessionCreate[] = [];
  const created: Record<string, unknown>[] = [];
  const updated: Array<{ id: string; params: Record<string, unknown> }> = [];
  let createCount = 0;

  return {
    sessions,
    created,
    updated,
    stripe: {
      customers: {
        list: async ({ email }: { email: string }) => {
          assertEquals(email, USER.email);
          return {
            data: options?.existingCustomerId ? [{ id: options.existingCustomerId }] : [],
          };
        },
        create: async (params: Record<string, unknown>) => {
          created.push(params);
          const id = options?.createdIds?.[createCount] ?? `cus_new_${createCount + 1}`;
          createCount += 1;
          return { id };
        },
        update: async (id: string, params: Record<string, unknown>) => {
          updated.push({ id, params });
          return { id };
        },
        listTaxIds: async () => ({ data: [] }),
        createTaxId: async () => ({}),
      },
      checkout: {
        sessions: {
          create: async (params: SessionCreate) => {
            sessions.push(params);
            return { id: "cs_test_academy", url: "https://checkout.stripe.com/c/pay/cs_test_academy" };
          },
        },
      },
    },
  };
}

function createServiceClient(options: {
  courses?: Record<string, typeof SOLO_COURSE | { stripe_price_id: string | null } & Omit<typeof SOLO_COURSE, "stripe_price_id">>;
  coursesByCode?: Record<string, typeof SOLO_COURSE>;
  org?: { name: string; slug: string } | null;
  billingProfile?: typeof BILLING_PROFILE | null;
  user?: { id: string; email?: string | null } | null;
}) {
  const courses = options.courses ?? { [SOLO_COURSE.id]: SOLO_COURSE };
  const coursesByCode = options.coursesByCode ?? {
    [SOLO_COURSE.product_code]: SOLO_COURSE,
    [TEAM5_COURSE.product_code]: TEAM5_COURSE,
    [TEAM10_COURSE.product_code]: TEAM10_COURSE,
  };

  return {
    auth: {
      getUser: async () => ({
        data: { user: options.user === undefined ? USER : options.user },
        error: options.user === null ? { message: "nope" } : null,
      }),
    },
    from: (table: string) => ({
      select: (_columns: string) => ({
        eq: (column: string, value: string) => {
          const maybeSingle = async () => {
            if (table === "academy_courses" && column === "id") {
              return { data: courses[value] ?? null, error: null };
            }
            if (table === "academy_courses" && column === "product_code") {
              return { data: coursesByCode[value] ?? null, error: null };
            }
            if (table === "org_billing_profiles" && column === "organization_id") {
              return { data: options.billingProfile ?? null, error: null };
            }
            return { data: null, error: null };
          };
          return {
            maybeSingle,
            single: async () => {
              if (table === "organizations" && column === "id") {
                const org = options.org === undefined
                  ? { name: "Academy Org", slug: "academy-org" }
                  : options.org;
                return org
                  ? { data: org, error: null }
                  : { data: null, error: { message: "not found" } };
              }
              return maybeSingle();
            },
            order: () => ({
              limit: () => ({ maybeSingle }),
            }),
            limit: () => ({ maybeSingle }),
          };
        },
      }),
    }),
  };
}

function createUserClient(isAdmin: boolean, error: { message: string } | null = null) {
  return {
    rpc: async (fn: string, args?: Record<string, unknown>) => {
      assertEquals(fn, "is_org_admin");
      assertEquals(args?.p_org_id, ORG_ID);
      return { data: isAdmin, error };
    },
  };
}

async function parseJson(res: Response): Promise<{ status: number; body: Record<string, unknown> }> {
  return { status: res.status, body: await res.json() };
}

Deno.test("AC1 Solo: session uses course price, payment mode, tax, invoice and metadata", async () => {
  const stripe = createStripeMock();
  const res = await runAcademyCheckout({
    user: USER,
    body: { courseId: SOLO_COURSE.id },
    origin: "https://hub.example",
    deps: {
      userClient: createUserClient(false),
      serviceClient: createServiceClient({}),
      stripe: stripe.stripe,
    },
  });
  const { status, body } = await parseJson(res);
  assertEquals(status, 200);
  assertEquals(body.checkoutUrl, "https://checkout.stripe.com/c/pay/cs_test_academy");

  const session = stripe.sessions[0];
  assertEquals(session.mode, "payment");
  assertEquals(session.line_items, [{ price: "price_solo_test", quantity: 1 }]);
  assertEquals(session.automatic_tax, { enabled: true });
  assertEquals(session.tax_id_collection, { enabled: true });
  assertEquals((session.invoice_creation as { enabled: boolean }).enabled, true);
  assertEquals(session.success_url, "https://hub.example/academy/published-course?payment=success");
  assertEquals(session.cancel_url, "https://hub.example/academy/published-course");
  assertEquals(session.metadata, {
    kind: "academy",
    product_code: "solo_bundle",
    course_id: SOLO_COURSE.id,
    user_id: USER.id,
    seats: "1",
  });
  assertEquals((session.metadata as Record<string, string>).organization_id, undefined);
});

Deno.test("AC1 Team 5: org admin gets seats 5 and organization_id metadata", async () => {
  const stripe = createStripeMock();
  const res = await runAcademyCheckout({
    user: USER,
    body: { productCode: "team_5", organizationId: ORG_ID },
    origin: "https://hub.example",
    deps: {
      userClient: createUserClient(true),
      serviceClient: createServiceClient({
        coursesByCode: { team_5: TEAM5_COURSE },
        billingProfile: BILLING_PROFILE,
      }),
      stripe: stripe.stripe,
    },
  });
  const { status } = await parseJson(res);
  assertEquals(status, 200);
  const session = stripe.sessions[0];
  assertEquals((session.metadata as Record<string, string>).seats, "5");
  assertEquals((session.metadata as Record<string, string>).organization_id, ORG_ID);
  assertEquals((session.metadata as Record<string, string>).product_code, "team_5");
  assertEquals(session.line_items, [{ price: "price_team5_test", quantity: 1 }]);
});

Deno.test("AC1 Team 10: org admin gets seats 10", async () => {
  const stripe = createStripeMock();
  const res = await runAcademyCheckout({
    user: USER,
    body: { courseId: TEAM10_COURSE.id, organizationId: ORG_ID },
    origin: "https://hub.example",
    deps: {
      userClient: createUserClient(true),
      serviceClient: createServiceClient({
        courses: { [TEAM10_COURSE.id]: TEAM10_COURSE },
        billingProfile: BILLING_PROFILE,
      }),
      stripe: stripe.stripe,
    },
  });
  const { status } = await parseJson(res);
  assertEquals(status, 200);
  assertEquals((stripe.sessions[0].metadata as Record<string, string>).seats, "10");
});

Deno.test("AC1 Team: non-admin is rejected with 403", async () => {
  const stripe = createStripeMock();
  const res = await runAcademyCheckout({
    user: USER,
    body: { productCode: "team_5", organizationId: ORG_ID },
    origin: "https://hub.example",
    deps: {
      userClient: createUserClient(false),
      serviceClient: createServiceClient({ coursesByCode: { team_5: TEAM5_COURSE } }),
      stripe: stripe.stripe,
    },
  });
  const { status, body } = await parseJson(res);
  assertEquals(status, 403);
  assertEquals(body.error, "Only organization admins can purchase Team seats");
  assertEquals(stripe.sessions.length, 0);
});

Deno.test("AC1 Team: missing organizationId is rejected with 400", async () => {
  const stripe = createStripeMock();
  const res = await runAcademyCheckout({
    user: USER,
    body: { productCode: "team_10" },
    origin: "https://hub.example",
    deps: {
      userClient: createUserClient(true),
      serviceClient: createServiceClient({ coursesByCode: { team_10: TEAM10_COURSE } }),
      stripe: stripe.stripe,
    },
  });
  const { status, body } = await parseJson(res);
  assertEquals(status, 400);
  assertEquals(body.error, "organizationId is required for Team purchases");
  assertEquals(stripe.sessions.length, 0);
});

Deno.test("AC2 resolveCustomer reuses the email customer and does not create a second one", async () => {
  const stripe = createStripeMock({ existingCustomerId: "cus_existing" });
  const first = await resolveCustomer({
    stripe: stripe.stripe,
    email: USER.email,
    userId: USER.id,
  });
  const second = await resolveCustomer({
    stripe: stripe.stripe,
    email: USER.email,
    userId: USER.id,
  });
  assertEquals(first, "cus_existing");
  assertEquals(second, "cus_existing");
  assertEquals(stripe.created.length, 0);
});

Deno.test("AC2 second Solo purchase attaches the existing customer to the session", async () => {
  const stripe = createStripeMock({ existingCustomerId: "cus_existing" });
  const res = await runAcademyCheckout({
    user: USER,
    body: { courseId: SOLO_COURSE.id },
    origin: "https://hub.example",
    deps: {
      userClient: createUserClient(false),
      serviceClient: createServiceClient({}),
      stripe: stripe.stripe,
    },
  });
  assertEquals((await parseJson(res)).status, 200);
  assertEquals(stripe.sessions[0].customer, "cus_existing");
  assertEquals(stripe.created.length, 0);
});

Deno.test("course without stripe_price_id is rejected and never hardcodes a price", async () => {
  const stripe = createStripeMock();
  const res = await runAcademyCheckout({
    user: USER,
    body: { courseId: SOLO_COURSE.id },
    origin: "https://hub.example",
    deps: {
      userClient: createUserClient(false),
      serviceClient: createServiceClient({
        courses: { [SOLO_COURSE.id]: { ...SOLO_COURSE, stripe_price_id: null } },
      }),
      stripe: stripe.stripe,
    },
  });
  const { status, body } = await parseJson(res);
  assertEquals(status, 400);
  assertEquals(body.error, "This course is not configured for purchase yet");
  assertEquals(stripe.sessions.length, 0);
});

Deno.test("HTTP handler requires a signed-in user", async () => {
  const res = await handleAcademyCheckoutRequest(
    new Request("https://example/academy-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: SOLO_COURSE.id }),
    }),
    async () => {
      throw new Error("factory should not run without auth");
    },
  );
  assertEquals(res.status, 401);
});

Deno.test("HTTP handler creates a Solo session for a signed-in user", async () => {
  const stripe = createStripeMock();
  const req = new Request("https://example/academy-checkout", {
    method: "POST",
    headers: {
      Authorization: "Bearer test-token",
      origin: "https://hub.example",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ courseId: SOLO_COURSE.id }),
  });
  const res = await handleAcademyCheckoutRequest(req, async () => ({
    userClient: createUserClient(false),
    serviceClient: createServiceClient({}),
    stripe: stripe.stripe,
  }));
  const { status, body } = await parseJson(res);
  assertEquals(status, 200);
  assertExists(body.checkoutUrl);
});
