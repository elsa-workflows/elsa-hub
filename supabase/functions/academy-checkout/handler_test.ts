import { assertEquals, assertExists } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import {
  ACADEMY_INVOICE_FOOTER,
  ACADEMY_SELLER_FOOTER_LINE,
  ACADEMY_STATEMENT_DESCRIPTOR_SUFFIX,
  ACADEMY_STRIPE_SUBMIT_MESSAGE,
  ACADEMY_STRIPE_TOS_ACCEPTANCE,
  ACADEMY_TERMS_VERSION,
} from "../_shared/academyLegal.ts";
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
  is_published: true,
};

const TEAM5_COURSE = {
  id: "00000000-0000-4000-8000-000000002005",
  slug: "team-5",
  title: "Team 5",
  product_code: "team_5",
  stripe_price_id: "price_team5_test",
  price_cents: 9900,
  currency: "eur",
  is_published: false,
};

const TEAM10_COURSE = {
  ...TEAM5_COURSE,
  id: "00000000-0000-4000-8000-000000002010",
  slug: "team-10",
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
type CourseRow = Omit<typeof SOLO_COURSE, "stripe_price_id"> & {
  stripe_price_id: string | null;
};

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
  courses?: CourseRow[];
  org?: { name: string; slug: string } | null;
  billingProfile?: typeof BILLING_PROFILE | null;
  user?: { id: string; email?: string | null } | null;
} = {}) {
  const courses = options.courses ?? [SOLO_COURSE, TEAM5_COURSE, TEAM10_COURSE];
  const tableReads: string[] = [];

  return {
    tableReads,
    auth: {
      getUser: async () => ({
        data: { user: options.user === undefined ? USER : options.user },
        error: options.user === null ? { message: "nope" } : null,
      }),
    },
    from: (table: string) => {
      tableReads.push(table);
      const filters: Array<[string, unknown]> = [];
      const api = {
        select: (_columns: string) => api,
        eq: (column: string, value: unknown) => {
          filters.push([column, value]);
          return api;
        },
        order: () => api,
        limit: async (_n: number) => ({ data: match(), error: null }),
        maybeSingle: async () => {
          const rows = match();
          if (rows.length > 1) {
            return { data: null, error: { code: "PGRST116", message: "multiple rows" } };
          }
          return { data: rows[0] ?? null, error: null };
        },
        single: async () => {
          const rows = match();
          if (rows.length !== 1) {
            return { data: null, error: { message: "not found" } };
          }
          return { data: rows[0], error: null };
        },
      };
      function match(): unknown[] {
        if (table === "academy_courses") {
          return courses.filter((row) =>
            filters.every(([column, value]) => (row as Record<string, unknown>)[column] === value)
          );
        }
        if (table === "organizations") {
          const org = options.org === undefined
            ? { id: ORG_ID, name: "Academy Org", slug: "academy-org" }
            : options.org;
          if (!org) return [];
          if (filters.some(([column, value]) => column === "id" && value !== ORG_ID)) return [];
          return [org];
        }
        if (table === "org_billing_profiles") {
          if (!options.billingProfile) return [];
          return [options.billingProfile];
        }
        return [];
      }
      return api;
    },
  };
}

function createUserClient(isAdmin: boolean, error: { message: string } | null = null) {
  let called = false;
  return {
    get called() {
      return called;
    },
    rpc: async (fn: string, args?: Record<string, unknown>) => {
      called = true;
      assertEquals(fn, "is_org_admin");
      assertEquals(args?.p_org_id, ORG_ID);
      return { data: isAdmin, error };
    },
  };
}

async function parseJson(res: Response): Promise<{ status: number; body: Record<string, unknown> }> {
  return { status: res.status, body: await res.json() };
}

function envWithTosConsent(enabled: boolean) {
  return {
    get: (key: string) =>
      key === "ACADEMY_TOS_CONSENT_ENABLED" && enabled ? "true" : undefined,
  };
}

function assertCommonAcademySessionParams(
  session: SessionCreate,
  options: { consentEnabled: boolean; team: boolean; productCode: string; seats: string },
) {
  assertEquals(session.mode, "payment");
  assertEquals(session.automatic_tax, { enabled: true });
  assertEquals(session.adaptive_pricing, { enabled: false });
  assertEquals(session.tax_id_collection, { enabled: options.team });
  assertEquals(session.payment_intent_data, {
    statement_descriptor_suffix: ACADEMY_STATEMENT_DESCRIPTOR_SUFFIX,
  });
  assertEquals(ACADEMY_STATEMENT_DESCRIPTOR_SUFFIX, "ELSA ACADEMY");
  assertEquals(ACADEMY_STATEMENT_DESCRIPTOR_SUFFIX.length <= 22, true);

  const customText = session.custom_text as Record<string, { message: string }>;
  assertEquals(customText.submit, { message: ACADEMY_STRIPE_SUBMIT_MESSAGE });

  const invoice = session.invoice_creation as {
    enabled: boolean;
    invoice_data: { footer: string; metadata: Record<string, string> };
  };
  assertEquals(invoice.enabled, true);
  assertEquals(invoice.invoice_data.footer, ACADEMY_INVOICE_FOOTER);
  assertEquals(invoice.invoice_data.footer.includes(ACADEMY_SELLER_FOOTER_LINE), true);
  assertEquals(invoice.invoice_data.footer.includes("Meervelderweg"), false);
  assertEquals(invoice.invoice_data.footer.includes("3888"), false);
  assertEquals(invoice.invoice_data.metadata.terms_version, ACADEMY_TERMS_VERSION);

  const metadata = session.metadata as Record<string, string>;
  assertEquals(metadata.kind, "academy");
  assertEquals(metadata.product_code, options.productCode);
  assertEquals(metadata.seats, options.seats);
  assertEquals(metadata.terms_version, ACADEMY_TERMS_VERSION);

  if (options.consentEnabled) {
    assertEquals(session.consent_collection, { terms_of_service: "required" });
    assertEquals(customText.terms_of_service_acceptance, {
      message: ACADEMY_STRIPE_TOS_ACCEPTANCE,
    });
  } else {
    assertEquals(session.consent_collection, undefined);
    assertEquals(customText.terms_of_service_acceptance, undefined);
  }

  if (options.team) {
    assertEquals(session.billing_address_collection, "required");
  } else {
    assertEquals(session.billing_address_collection, undefined);
  }
}

Deno.test("AC1 Solo: session uses course price, payment mode, tax, invoice and metadata", async () => {
  const stripe = createStripeMock();
  const res = await runAcademyCheckout({
    user: USER,
    body: { courseId: SOLO_COURSE.id },
    origin: "https://hub.example",
    deps: {
      userClient: createUserClient(false),
      serviceClient: createServiceClient(),
      stripe: stripe.stripe,
      env: envWithTosConsent(false),
    },
  });
  const { status, body } = await parseJson(res);
  assertEquals(status, 200);
  assertEquals(body.checkoutUrl, "https://checkout.stripe.com/c/pay/cs_test_academy");

  const session = stripe.sessions[0];
  assertEquals(session.line_items, [{ price: "price_solo_test", quantity: 1 }]);
  assertEquals(session.success_url, "https://hub.example/academy/published-course?payment=success");
  assertEquals(session.cancel_url, "https://hub.example/academy/published-course");
  assertEquals(session.metadata, {
    kind: "academy",
    product_code: "solo_bundle",
    course_id: SOLO_COURSE.id,
    user_id: USER.id,
    seats: "1",
    terms_version: ACADEMY_TERMS_VERSION,
  });
  assertEquals((session.metadata as Record<string, string>).organization_id, undefined);
  assertCommonAcademySessionParams(session, {
    consentEnabled: false,
    team: false,
    productCode: "solo_bundle",
    seats: "1",
  });
});

Deno.test("AC1 Solo with organizationId is rejected with 400 and does not read org billing", async () => {
  const stripe = createStripeMock();
  const userClient = createUserClient(true);
  const service = createServiceClient({ billingProfile: BILLING_PROFILE });
  const res = await runAcademyCheckout({
    user: USER,
    body: { courseSlug: SOLO_COURSE.slug, organizationId: ORG_ID },
    origin: "https://hub.example",
    deps: {
      userClient,
      serviceClient: service,
      stripe: stripe.stripe,
    },
  });
  const { status, body } = await parseJson(res);
  assertEquals(status, 400);
  assertEquals(body.error, "organizationId is not valid for Solo purchases");
  assertEquals(stripe.sessions.length, 0);
  assertEquals(userClient.called, false);
  assertEquals(service.tableReads.includes("organizations"), false);
  assertEquals(service.tableReads.includes("org_billing_profiles"), false);
});

Deno.test("AC1 Team 5: org admin gets seats 5 and organization_id metadata", async () => {
  const stripe = createStripeMock();
  const res = await runAcademyCheckout({
    user: USER,
    body: { productCode: "team_5", organizationId: ORG_ID },
    origin: "https://hub.example",
    deps: {
      userClient: createUserClient(true),
      serviceClient: createServiceClient({ billingProfile: BILLING_PROFILE }),
      stripe: stripe.stripe,
      env: envWithTosConsent(false),
    },
  });
  const { status } = await parseJson(res);
  assertEquals(status, 200);
  const session = stripe.sessions[0];
  assertEquals((session.metadata as Record<string, string>).seats, "5");
  assertEquals((session.metadata as Record<string, string>).organization_id, ORG_ID);
  assertEquals((session.metadata as Record<string, string>).product_code, "team_5");
  assertEquals((session.metadata as Record<string, string>).terms_version, ACADEMY_TERMS_VERSION);
  assertEquals(session.line_items, [{ price: "price_team5_test", quantity: 1 }]);
  assertCommonAcademySessionParams(session, {
    consentEnabled: false,
    team: true,
    productCode: "team_5",
    seats: "5",
  });
});

Deno.test("AC1 Team 10: org admin gets seats 10 from the team-10 SKU row", async () => {
  const stripe = createStripeMock();
  const res = await runAcademyCheckout({
    user: USER,
    body: { productCode: "team_10", organizationId: ORG_ID },
    origin: "https://hub.example",
    deps: {
      userClient: createUserClient(true),
      serviceClient: createServiceClient({ billingProfile: BILLING_PROFILE }),
      stripe: stripe.stripe,
    },
  });
  const { status } = await parseJson(res);
  assertEquals(status, 200);
  assertEquals((stripe.sessions[0].metadata as Record<string, string>).seats, "10");
  assertEquals(stripe.sessions[0].line_items, [{ price: "price_team10_test", quantity: 1 }]);
});

Deno.test("AC1 Team: non-admin is rejected with 403 and no org data is read", async () => {
  const stripe = createStripeMock();
  const service = createServiceClient({ billingProfile: BILLING_PROFILE });
  const res = await runAcademyCheckout({
    user: USER,
    body: { productCode: "team_5", organizationId: ORG_ID },
    origin: "https://hub.example",
    deps: {
      userClient: createUserClient(false),
      serviceClient: service,
      stripe: stripe.stripe,
    },
  });
  const { status, body } = await parseJson(res);
  assertEquals(status, 403);
  assertEquals(body.error, "Only organization admins can purchase Team seats");
  assertEquals(stripe.sessions.length, 0);
  assertEquals(service.tableReads.includes("organizations"), false);
  assertEquals(service.tableReads.includes("org_billing_profiles"), false);
});

Deno.test("AC1 Team: missing organizationId is rejected with 400", async () => {
  const stripe = createStripeMock();
  const res = await runAcademyCheckout({
    user: USER,
    body: { productCode: "team_10" },
    origin: "https://hub.example",
    deps: {
      userClient: createUserClient(true),
      serviceClient: createServiceClient(),
      stripe: stripe.stripe,
    },
  });
  const { status, body } = await parseJson(res);
  assertEquals(status, 400);
  assertEquals(body.error, "organizationId is required for Team purchases");
  assertEquals(stripe.sessions.length, 0);
});

async function checkoutSolo(options: { consentEnabled: boolean }) {
  const stripe = createStripeMock();
  const res = await runAcademyCheckout({
    user: USER,
    body: { courseId: SOLO_COURSE.id },
    origin: "https://hub.example",
    deps: {
      userClient: createUserClient(false),
      serviceClient: createServiceClient(),
      stripe: stripe.stripe,
      env: envWithTosConsent(options.consentEnabled),
    },
  });
  const { status } = await parseJson(res);
  assertEquals(status, 200);
  return stripe.sessions[0];
}

async function checkoutTeam(options: { consentEnabled: boolean; productCode: "team_5" | "team_10" }) {
  const stripe = createStripeMock();
  const res = await runAcademyCheckout({
    user: USER,
    body: { productCode: options.productCode, organizationId: ORG_ID },
    origin: "https://hub.example",
    deps: {
      userClient: createUserClient(true),
      serviceClient: createServiceClient({ billingProfile: BILLING_PROFILE }),
      stripe: stripe.stripe,
      env: envWithTosConsent(options.consentEnabled),
    },
  });
  const { status } = await parseJson(res);
  assertEquals(status, 200);
  return stripe.sessions[0];
}

Deno.test("Solo consent off: tax id off, submit and footer always, no ToS consent params", async () => {
  const session = await checkoutSolo({ consentEnabled: false });
  assertCommonAcademySessionParams(session, {
    consentEnabled: false,
    team: false,
    productCode: "solo_bundle",
    seats: "1",
  });
});

Deno.test("Solo consent on: ToS required plus acceptance text, tax id still off", async () => {
  const session = await checkoutSolo({ consentEnabled: true });
  assertCommonAcademySessionParams(session, {
    consentEnabled: true,
    team: false,
    productCode: "solo_bundle",
    seats: "1",
  });
});

Deno.test("Team 5 consent off: tax id on, billing address required, no ToS consent params", async () => {
  const session = await checkoutTeam({ consentEnabled: false, productCode: "team_5" });
  assertCommonAcademySessionParams(session, {
    consentEnabled: false,
    team: true,
    productCode: "team_5",
    seats: "5",
  });
});

Deno.test("Team 5 consent on: ToS required plus acceptance text, VAT collection kept", async () => {
  const session = await checkoutTeam({ consentEnabled: true, productCode: "team_5" });
  assertCommonAcademySessionParams(session, {
    consentEnabled: true,
    team: true,
    productCode: "team_5",
    seats: "5",
  });
});

Deno.test("Team 10 consent off and on both keep tax id, billing address and footer", async () => {
  const off = await checkoutTeam({ consentEnabled: false, productCode: "team_10" });
  const on = await checkoutTeam({ consentEnabled: true, productCode: "team_10" });
  assertCommonAcademySessionParams(off, {
    consentEnabled: false,
    team: true,
    productCode: "team_10",
    seats: "10",
  });
  assertCommonAcademySessionParams(on, {
    consentEnabled: true,
    team: true,
    productCode: "team_10",
    seats: "10",
  });
  assertEquals(off.line_items, [{ price: "price_team10_test", quantity: 1 }]);
  assertEquals(on.line_items, [{ price: "price_team10_test", quantity: 1 }]);
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
      serviceClient: createServiceClient(),
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
        courses: [{ ...SOLO_COURSE, stripe_price_id: null }],
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
    serviceClient: createServiceClient(),
    stripe: stripe.stripe,
  }));
  const { status, body } = await parseJson(res);
  assertEquals(status, 200);
  assertExists(body.checkoutUrl);
});
