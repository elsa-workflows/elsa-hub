// Shared test doubles for the Cloud checkout, portal and status tests.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { corsHeaders, hasNoStore } from "./cloud-http.ts";

type Row = Record<string, unknown>;

export const HUB_ORG = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const OTHER_ORG = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const CONTROL_ORG = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
export const CLIENT_CONTROL_ORG = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
export const ADMIN = "admin-1";
/** The Hub site the test env names in SITE_URL, and the default request origin. */
export const SITE_ORIGIN = "https://elsa-hub.example";

export const SECRET_DB_ERROR = { message: "secret db detail", code: "XX000" };

export function validatedLink(hubOrganizationId = HUB_ORG, controlOrganizationId = CONTROL_ORG) {
  return {
    hub_organization_id: hubOrganizationId,
    control_organization_id: controlOrganizationId,
    validated_at: "2026-10-16T00:00:00.000Z",
  };
}

export function storedOrgCustomer(organizationId: string, stripeCustomerId: string) {
  return { organization_id: organizationId, livemode: false, stripe_customer_id: stripeCustomerId };
}

/**
 * Structural stand-in for a supabase-js client over in-memory tables. eq()
 * filters rows; maybeSingle() returns the first match; awaiting the query
 * returns every match; insert() appends. A table in failTables answers every
 * read and write with SECRET_DB_ERROR. rpc answers from the given map.
 */
export function fakeSupabase(options: {
  tables?: Record<string, Row[]>;
  failTables?: string[];
  rpc?: Record<string, (args: { p_org_id?: string }) => unknown>;
} = {}) {
  const tables = options.tables ?? {};
  const failTables = new Set(options.failTables ?? []);
  const reads: string[] = [];

  const client = {
    reads,
    tables,
    rpc: (fn: string, args: { p_org_id?: string }) =>
      Promise.resolve({ data: options.rpc?.[fn]?.(args) ?? null, error: null }),
    from(table: string) {
      reads.push(table);
      const fails = failTables.has(table);
      const predicates: Array<(row: Row) => boolean> = [];
      const matches = () => (tables[table] ?? []).filter((row) => predicates.every((test) => test(row)));
      const query = {
        select: (_columns: string) => query,
        eq: (column: string, value: unknown) => {
          predicates.push((row) => row[column] === value);
          return query;
        },
        maybeSingle: () =>
          Promise.resolve(
            fails ? { data: null, error: SECRET_DB_ERROR } : { data: matches()[0] ?? null, error: null },
          ),
        then: <T>(resolve: (value: { data: Row[] | null; error: unknown }) => T) =>
          Promise.resolve(fails ? { data: null, error: SECRET_DB_ERROR } : { data: matches(), error: null })
            .then(resolve),
        insert: (row: Row) => {
          if (fails) return Promise.resolve({ error: SECRET_DB_ERROR });
          (tables[table] ??= []).push(row);
          return Promise.resolve({ error: null });
        },
      };
      return query;
    },
  };
  return client;
}

/** A user client for an org admin (or member, with admin: false) of the given orgs. */
export function fakeUserClient(options: {
  memberships?: Array<{ organization_id: string; role: string }>;
  admin?: boolean;
} = {}) {
  const memberships = options.memberships ?? [{ organization_id: HUB_ORG, role: "admin" }];
  const isMember = (args: { p_org_id?: string }) =>
    memberships.some((row) => row.organization_id === args.p_org_id);
  return fakeSupabase({
    tables: {
      organization_members: memberships.map((row) => ({ ...row, user_id: ADMIN })),
      organizations: [
        { id: HUB_ORG, name: "Org A", slug: "org-a" },
        { id: OTHER_ORG, name: "Org B", slug: "org-b" },
      ],
    },
    rpc: {
      is_org_member: isMember,
      is_org_admin: (args) => (options.admin ?? true) && isMember(args),
    },
  });
}

export type FakeSubscription = {
  id: string;
  status: string;
  metadata?: Record<string, string> | null;
};

export type FakeCheckoutSession = {
  id: string;
  status: string;
  url: string | null;
  success_url?: string | null;
  expires_at: number;
  metadata?: Record<string, string> | null;
};

/** A Checkout Session expires_at the given number of minutes from now. */
export function minutesFromNow(minutes: number): number {
  return Math.floor(Date.now() / 1000) + minutes * 60;
}

/** Stripe's list filter: no status means every subscription that is not canceled. */
function subscriptionMatches(status: unknown, sub: FakeSubscription): boolean {
  if (status === undefined) return sub.status !== "canceled";
  if (status === "all") return true;
  if (status === "ended") return sub.status === "canceled" || sub.status === "incomplete_expired";
  return sub.status === status;
}

/**
 * Records every Stripe call the Cloud handlers make. Lists honour status and
 * limit (Stripe's default page is 10) like the real API, newest first in the
 * given order.
 */
export function fakeStripe(
  subscriptions: FakeSubscription[] = [],
  options: {
    checkoutSessions?: FakeCheckoutSession[];
    portalError?: Error;
    customerUpdateError?: Error;
    expireError?: Error;
    subscriptionListError?: Error;
    sessionListError?: Error;
    sessionCreateError?: Error;
  } = {},
) {
  const calls = {
    customersCreated: 0,
    subscriptionLists: [] as Array<Record<string, unknown>>,
    sessionLists: [] as Array<Record<string, unknown>>,
    sessions: [] as Array<Record<string, unknown>>,
    expired: [] as string[],
    portals: [] as Array<{ customer: string; return_url: string }>,
  };
  const page = <T>(rows: T[], params: Record<string, unknown>) =>
    Promise.resolve({ data: rows.slice(0, (params.limit as number | undefined) ?? 10) });
  const stripe = {
    customers: {
      create: () => {
        calls.customersCreated += 1;
        return Promise.resolve({ id: "cus_created" });
      },
      update: (id: string) =>
        options.customerUpdateError ? Promise.reject(options.customerUpdateError) : Promise.resolve({ id }),
      del: (id: string) => Promise.resolve({ id }),
    },
    subscriptions: {
      list: (params: Record<string, unknown>) => {
        calls.subscriptionLists.push(params);
        if (options.subscriptionListError) return Promise.reject(options.subscriptionListError);
        return page(subscriptions.filter((sub) => subscriptionMatches(params.status, sub)), params);
      },
    },
    checkout: {
      sessions: {
        list: (params: Record<string, unknown>) => {
          calls.sessionLists.push(params);
          if (options.sessionListError) return Promise.reject(options.sessionListError);
          const sessions = options.checkoutSessions ?? [];
          return page(sessions.filter((session) => !params.status || session.status === params.status), params);
        },
        expire: (id: string) => {
          calls.expired.push(id);
          return options.expireError ? Promise.reject(options.expireError) : Promise.resolve({ id });
        },
        create: (params: unknown) => {
          calls.sessions.push(params as Record<string, unknown>);
          if (options.sessionCreateError) return Promise.reject(options.sessionCreateError);
          return Promise.resolve({ url: "https://checkout.example/session" });
        },
      },
    },
    billingPortal: {
      sessions: {
        create: (params: { customer: string; return_url: string }) => {
          calls.portals.push(params);
          return options.portalError
            ? Promise.reject(options.portalError)
            : Promise.resolve({ url: "https://billing.example/portal" });
        },
      },
    },
  };
  return { stripe, calls };
}

export function testEnv(overrides: Record<string, string | undefined> = {}) {
  const values: Record<string, string | undefined> = {
    STRIPE_SECRET_KEY: "sk_test_cloud",
    STRIPE_CLOUD_PRICE_ID: "price_test_cloud",
    SITE_URL: SITE_ORIGIN,
    ...overrides,
  };
  return { get: (key: string) => values[key] };
}

export function hubRequest(path: string, origin = SITE_ORIGIN) {
  return new Request(`${SITE_ORIGIN}/functions/v1/${path}`, {
    method: "POST",
    headers: { origin },
  });
}

/** Every Cloud response, failures included, is no-store and carries the CORS headers. */
export function assertNoStoreWithCors(response: Response) {
  assertEquals(hasNoStore(response), true, "Cache-Control: no-store is missing");
  for (const [name, value] of Object.entries(corsHeaders())) {
    assertEquals(response.headers.get(name), value, `${name} is missing`);
  }
}

/** Runs fn with console.error silenced and returns what was logged. */
export async function captureConsoleError<T>(fn: () => Promise<T>): Promise<{ result: T; logged: string }> {
  const original = console.error;
  const lines: string[] = [];
  console.error = (...args: unknown[]) => {
    lines.push(
      args.map((arg) =>
        typeof arg === "string" ? arg : arg instanceof Error ? arg.message : JSON.stringify(arg)
      ).join(" "),
    );
  };
  try {
    return { result: await fn(), logged: lines.join("\n") };
  } finally {
    console.error = original;
  }
}
