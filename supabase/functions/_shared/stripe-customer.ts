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
 * Returns the stored Stripe customer id for that owner and livemode. When none
 * exists, creates one in Stripe with owner-derived metadata only (idempotency
 * key cust:org:<id>:<livemode> or cust:user:<id>:<livemode>), stores the ref,
 * then updates email, name, address, and the caller's extra metadata. The
 * create parameters must depend on the owner alone: Stripe rejects a reused
 * idempotency key whose parameters differ, so two admins of one org racing
 * (or retrying within 24 hours) would otherwise fail. Concurrent creates rely
 * on unique (owner, livemode) plus an on-conflict re-read. If this call
 * created a different Stripe customer than the stored winner, that orphan is
 * deleted.
 *
 * getStoredStripeCustomerId is the read-only lookup (customer-portal): it
 * never creates a customer.
 *
 * livemode is derived from the Stripe secret key prefix (sk_live_ and rk_live_
 * are live; see isLiveStripeKey).
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
    create: (
      params: { metadata?: Record<string, string> },
      options?: { idempotencyKey?: string },
    ) => Promise<{ id: string }>;
    update: (id: string, params: StripeCustomerCreateParams) => Promise<{ id: string }>;
    del: (id: string) => Promise<{ id: string }>;
  };
};

export type StripeCustomerRow = {
  stripe_customer_id: string;
};

export type StripeCustomerQueryError = { message: string; code?: string };

export type StripeCustomerStore = {
  from: (table: string) => {
    select: (columns: string) => StripeCustomerFilter;
    insert: (
      row: Record<string, string | boolean>,
    ) => PromiseLike<{ error: StripeCustomerQueryError | null }>;
  };
};

export type StripeCustomerFilter = {
  eq: (column: string, value: string | boolean) => StripeCustomerFilter;
  maybeSingle: () => PromiseLike<{ data: StripeCustomerRow | null; error: StripeCustomerQueryError | null }>;
};

export type GetOrCreateStripeCustomerDeps = {
  stripe?: StripeCustomerClient;
  supabase?: unknown;
  email?: string;
  name?: string;
  address?: StripeCustomerAddress;
  metadata?: Record<string, string>;
  stripeSecretKey?: string;
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

/** Live secret (sk_live_) and restricted (rk_live_) keys are live mode; everything else is test. */
export function isLiveStripeKey(key: string | undefined): boolean {
  return (key ?? "").startsWith("sk_live_") || (key ?? "").startsWith("rk_live_");
}

function idempotencyKey(owner: StripeCustomerOwner, livemode: boolean): string {
  return isOrgOwner(owner)
    ? `cust:org:${owner.orgId}:${livemode}`
    : `cust:user:${owner.userId}:${livemode}`;
}

function isUniqueViolation(error: StripeCustomerQueryError): boolean {
  return error.code === "23505";
}

function envGet(name: string): string | undefined {
  return (globalThis as { Deno?: { env: { get: (key: string) => string | undefined } } }).Deno?.env.get(name);
}

type ResolvedStripeCustomerDeps = GetOrCreateStripeCustomerDeps & {
  stripe: StripeCustomerClient;
  supabase: StripeCustomerStore;
  stripeSecretKey?: string;
};

async function resolveDeps(
  deps?: GetOrCreateStripeCustomerDeps,
): Promise<ResolvedStripeCustomerDeps> {
  const stripeSecretKey = deps?.stripeSecretKey ?? envGet("STRIPE_SECRET_KEY");

  if (deps?.stripe && deps?.supabase) {
    return {
      ...deps,
      stripe: deps.stripe,
      supabase: deps.supabase as StripeCustomerStore,
      stripeSecretKey,
    };
  }

  const supabaseUrl = envGet("SUPABASE_URL");
  const serviceRoleKey = envGet("SUPABASE_SERVICE_ROLE_KEY");

  if (!stripeSecretKey || !supabaseUrl || !serviceRoleKey) {
    throw new Error("getOrCreateStripeCustomer requires deps.stripe and deps.supabase, or Stripe and Supabase env vars");
  }

  const [{ default: Stripe }, { createClient }] = await Promise.all([
    import("https://esm.sh/stripe@18.5.0"),
    import("https://esm.sh/@supabase/supabase-js@2.57.2"),
  ]);

  return {
    ...deps,
    stripe: new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" }) as StripeCustomerClient,
    supabase: createClient(supabaseUrl, serviceRoleKey) as unknown as StripeCustomerStore,
    stripeSecretKey,
  };
}

async function readStoredCustomerId(
  supabase: StripeCustomerStore,
  owner: StripeCustomerOwner,
  livemode: boolean,
): Promise<string | null> {
  const { data, error } = await supabase
    .from(ownerTable(owner))
    .select("stripe_customer_id")
    .eq(ownerColumn(owner), ownerValue(owner))
    .eq("livemode", livemode)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read stored Stripe customer: ${error.message}`);
  }

  return data?.stripe_customer_id ?? null;
}

async function storeCustomerId(
  supabase: StripeCustomerStore,
  owner: StripeCustomerOwner,
  livemode: boolean,
  stripeCustomerId: string,
): Promise<"ok" | "conflict"> {
  const row: Record<string, string | boolean> = isOrgOwner(owner)
    ? { organization_id: owner.orgId, livemode, stripe_customer_id: stripeCustomerId }
    : { user_id: owner.userId, livemode, stripe_customer_id: stripeCustomerId };

  const { error } = await supabase.from(ownerTable(owner)).insert(row);
  if (!error) return "ok";
  if (isUniqueViolation(error)) return "conflict";
  throw new Error(`Failed to store Stripe customer: ${error.message}`);
}

async function deleteOrphan(
  stripe: StripeCustomerClient,
  createdId: string,
  storedId: string,
): Promise<void> {
  if (!createdId || createdId === storedId) return;
  try {
    await stripe.customers.del(createdId);
  } catch (error) {
    console.error("Failed to delete orphan Stripe customer:", error);
  }
}

export async function getOrCreateStripeCustomer(
  owner: StripeCustomerOwner,
  deps?: GetOrCreateStripeCustomerDeps,
): Promise<string> {
  if (isOrgOwner(owner) ? !owner.orgId : !owner.userId) {
    throw new Error("getOrCreateStripeCustomer requires owner.userId or owner.orgId");
  }

  const resolved = await resolveDeps(deps);
  const livemode = isLiveStripeKey(resolved.stripeSecretKey);
  const stored = await readStoredCustomerId(resolved.supabase, owner, livemode);
  if (stored) return stored;

  const ownerMetadata: Record<string, string> = isOrgOwner(owner)
    ? { organization_id: owner.orgId, livemode: String(livemode) }
    : { user_id: owner.userId, livemode: String(livemode) };
  const metadata: Record<string, string> = { ...(resolved.metadata ?? {}), ...ownerMetadata };

  const created = await resolved.stripe.customers.create(
    { metadata: ownerMetadata },
    { idempotencyKey: idempotencyKey(owner, livemode) },
  );

  if (!created?.id) {
    throw new Error("Stripe customer create returned no id");
  }

  const write = await storeCustomerId(resolved.supabase, owner, livemode, created.id);
  if (write === "conflict") {
    const raced = await readStoredCustomerId(resolved.supabase, owner, livemode);
    if (raced) {
      await deleteOrphan(resolved.stripe, created.id, raced);
      return raced;
    }
    throw new Error("Stripe customer store conflicted and no stored id could be re-read");
  }

  await resolved.stripe.customers.update(created.id, {
    ...(resolved.email ? { email: resolved.email } : {}),
    ...(resolved.name ? { name: resolved.name } : {}),
    ...(resolved.address ? { address: resolved.address } : {}),
    metadata,
  });

  return created.id;
}

/**
 * Read-only: the stored customer id for this owner in the mode of the Stripe
 * key, or null. Never creates a customer or calls Stripe.
 */
export async function getStoredStripeCustomerId(
  owner: StripeCustomerOwner,
  deps: { supabase: unknown; stripeSecretKey?: string },
): Promise<string | null> {
  if (isOrgOwner(owner) ? !owner.orgId : !owner.userId) {
    throw new Error("getStoredStripeCustomerId requires owner.userId or owner.orgId");
  }
  return await readStoredCustomerId(
    deps.supabase as StripeCustomerStore,
    owner,
    isLiveStripeKey(deps.stripeSecretKey ?? envGet("STRIPE_SECRET_KEY")),
  );
}
