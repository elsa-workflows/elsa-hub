/**
 * Hub Stripe customer identity.
 *
 * Public helper (stable signature; other functions such as academy-checkout import this):
 *
 *   getOrCreateStripeCustomer(
 *     owner: { userId: string } | { orgId: string },
 *     deps?: GetOrCreateStripeCustomerDeps,
 *   ): Promise<string>
 *
 * Returns the stored Stripe customer id for that owner. When none exists, creates
 * one in Stripe and stores it. Concurrent creates rely on unique owner constraints
 * and an on-conflict re-read. Runtime callers must not look up Stripe customers
 * by email; email is only sent when creating a new customer.
 *
 * deps.stripe and deps.supabase are required in tests. In edge functions they
 * may be omitted and are then built from STRIPE_SECRET_KEY, SUPABASE_URL, and
 * SUPABASE_SERVICE_ROLE_KEY.
 *
 * This module does not list Stripe customers by email.
 */

export type StripeCustomerOwner = { userId: string } | { orgId: string };

export type StripeCustomerAddress = {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
};

export type StripeCustomerCreateParams = {
  email?: string;
  name?: string;
  address?: StripeCustomerAddress;
  metadata?: Record<string, string>;
};

export type StripeCustomerClient = {
  customers: {
    create: (params: StripeCustomerCreateParams) => Promise<{ id: string }>;
  };
};

export type StripeCustomerRow = {
  stripe_customer_id: string;
};

export type StripeCustomerQueryError = { message: string; code?: string };

export type StripeCustomerStore = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => PromiseLike<{ data: StripeCustomerRow | null; error: StripeCustomerQueryError | null }>;
      };
    };
    insert: (
      row: Record<string, string>,
    ) => PromiseLike<{ error: StripeCustomerQueryError | null }>;
  };
};

export type GetOrCreateStripeCustomerDeps = {
  stripe?: StripeCustomerClient;
  supabase?: unknown;
  email?: string;
  name?: string;
  address?: StripeCustomerAddress;
  metadata?: Record<string, string>;
};

const ORG_TABLE = "org_stripe_customers";
const USER_TABLE = "user_stripe_customers";

function isOrgOwner(owner: StripeCustomerOwner): owner is { orgId: string } {
  return "orgId" in owner;
}

function ownerTable(owner: StripeCustomerOwner): string {
  return isOrgOwner(owner) ? ORG_TABLE : USER_TABLE;
}

function ownerColumn(owner: StripeCustomerOwner): string {
  return isOrgOwner(owner) ? "organization_id" : "user_id";
}

function ownerValue(owner: StripeCustomerOwner): string {
  return isOrgOwner(owner) ? owner.orgId : owner.userId;
}

function isUniqueViolation(error: { message: string; code?: string }): boolean {
  if (error.code === "23505") return true;
  const message = error.message.toLowerCase();
  return message.includes("duplicate") || message.includes("unique");
}

type ResolvedStripeCustomerDeps = GetOrCreateStripeCustomerDeps & {
  stripe: StripeCustomerClient;
  supabase: StripeCustomerStore;
};

async function resolveDeps(
  deps?: GetOrCreateStripeCustomerDeps,
): Promise<ResolvedStripeCustomerDeps> {
  if (deps?.stripe && deps?.supabase) {
    return {
      ...deps,
      stripe: deps.stripe,
      supabase: deps.supabase as StripeCustomerStore,
    };
  }

  const stripeKey = (globalThis as { Deno?: { env: { get: (key: string) => string | undefined } } }).Deno?.env.get("STRIPE_SECRET_KEY");
  const supabaseUrl = (globalThis as { Deno?: { env: { get: (key: string) => string | undefined } } }).Deno?.env.get("SUPABASE_URL");
  const serviceRoleKey = (globalThis as { Deno?: { env: { get: (key: string) => string | undefined } } }).Deno?.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!stripeKey || !supabaseUrl || !serviceRoleKey) {
    throw new Error("getOrCreateStripeCustomer requires deps.stripe and deps.supabase, or Stripe and Supabase env vars");
  }

  const [{ default: Stripe }, { createClient }] = await Promise.all([
    import("https://esm.sh/stripe@18.5.0"),
    import("https://esm.sh/@supabase/supabase-js@2.57.2"),
  ]);

  return {
    ...deps,
    stripe: new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" }) as StripeCustomerClient,
    supabase: createClient(supabaseUrl, serviceRoleKey) as unknown as StripeCustomerStore,
  };
}

async function readStoredCustomerId(
  supabase: StripeCustomerStore,
  owner: StripeCustomerOwner,
): Promise<string | null> {
  const { data, error } = await supabase
    .from(ownerTable(owner))
    .select("stripe_customer_id")
    .eq(ownerColumn(owner), ownerValue(owner))
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read stored Stripe customer: ${error.message}`);
  }

  return data?.stripe_customer_id ?? null;
}

async function storeCustomerId(
  supabase: StripeCustomerStore,
  owner: StripeCustomerOwner,
  stripeCustomerId: string,
): Promise<"ok" | "conflict"> {
  const row: Record<string, string> = isOrgOwner(owner)
    ? { organization_id: owner.orgId, stripe_customer_id: stripeCustomerId }
    : { user_id: owner.userId, stripe_customer_id: stripeCustomerId };

  const { error } = await supabase.from(ownerTable(owner)).insert(row);
  if (!error) return "ok";
  if (isUniqueViolation(error)) return "conflict";
  throw new Error(`Failed to store Stripe customer: ${error.message}`);
}

export async function getOrCreateStripeCustomer(
  owner: StripeCustomerOwner,
  deps?: GetOrCreateStripeCustomerDeps,
): Promise<string> {
  if (isOrgOwner(owner) ? !owner.orgId : !owner.userId) {
    throw new Error("getOrCreateStripeCustomer requires owner.userId or owner.orgId");
  }

  const resolved = await resolveDeps(deps);
  const stored = await readStoredCustomerId(resolved.supabase, owner);
  if (stored) return stored;

  const metadata: Record<string, string> = {
    ...(resolved.metadata ?? {}),
  };
  if (isOrgOwner(owner)) {
    metadata.organization_id = owner.orgId;
  } else {
    metadata.user_id = owner.userId;
  }

  const created = await resolved.stripe.customers.create({
    ...(resolved.email ? { email: resolved.email } : {}),
    ...(resolved.name ? { name: resolved.name } : {}),
    ...(resolved.address ? { address: resolved.address } : {}),
    metadata,
  });

  if (!created?.id) {
    throw new Error("Stripe customer create returned no id");
  }

  const write = await storeCustomerId(resolved.supabase, owner, created.id);
  if (write === "ok") return created.id;

  const raced = await readStoredCustomerId(resolved.supabase, owner);
  if (raced) return raced;

  throw new Error("Stripe customer store conflicted and no stored id could be re-read");
}
