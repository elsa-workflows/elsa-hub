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
 * Whenever the caller supplies email, name, address, or metadata, they are
 * written to the customer on every call, for a stored customer too, so the
 * current buyer's details are not left stale.
 *
 * Failures (database or Stripe) are logged with their detail and thrown as a
 * StripeCustomerError with a generic message, so a catch block can return
 * customerFailureResponse(error, headers) without leaking internals.
 *
 * getStoredStripeCustomerId is the read-only lookup (customer-portal): it
 * never creates a customer.
 *
 * livemode is derived from STRIPE_SECRET_KEY, read through the injected
 * deps.env (default Deno.env): sk_live_ and rk_live_ are live, see
 * isLiveStripeKey. A missing key is an error, never silently test mode.
 *
 * deps.stripe and deps.supabase are always injected. This module has no
 * imports so scripts (tsx) can import isLiveStripeKey.
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

export type EnvReader = { get: (key: string) => string | undefined };

export type GetOrCreateStripeCustomerDeps = {
  stripe: StripeCustomerClient;
  supabase: StripeCustomerStore;
  env?: EnvReader;
  email?: string;
  name?: string;
  address?: StripeCustomerAddress;
  metadata?: Record<string, string>;
};

const GENERIC_MESSAGE = "We couldn't set up your billing customer. Please try again later.";

/** Generic by design; the detail is logged. code is a Stripe error code, kept so callers can still branch on it. */
export class StripeCustomerError extends Error {
  readonly code?: string;
  constructor(code?: string) {
    super(GENERIC_MESSAGE);
    this.name = "StripeCustomerError";
    this.code = code;
  }
}

function fail(context: string, detail: unknown, code?: string): never {
  console.error(`${context}:`, detail);
  throw new StripeCustomerError(code);
}

async function stripeCall<T>(context: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    return fail(context, error, (error as { code?: string } | null)?.code);
  }
}

/** A 500 with the generic message when the error is the helper's; null for any other error. */
export function customerFailureResponse(
  error: unknown,
  headers: Record<string, string>,
): Response | null {
  if (!(error instanceof StripeCustomerError)) return null;
  return new Response(JSON.stringify({ error: error.message }), {
    status: 500,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

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

function isLiveMode(env: EnvReader | undefined): boolean {
  const key = (env ?? Deno.env).get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return isLiveStripeKey(key);
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

  if (error) fail("Failed to read stored Stripe customer", error);

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
  return fail("Failed to store Stripe customer", error);
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
  deps: GetOrCreateStripeCustomerDeps,
): Promise<string> {
  if (isOrgOwner(owner) ? !owner.orgId : !owner.userId) {
    throw new Error("getOrCreateStripeCustomer requires owner.userId or owner.orgId");
  }

  const { stripe, supabase } = deps;
  const livemode = isLiveMode(deps.env);
  const customerId = await readStoredCustomerId(supabase, owner, livemode) ??
    await createAndStoreCustomer(deps, owner, livemode);

  if (deps.email || deps.name || deps.address || deps.metadata) {
    const ownerMetadata = ownerMetadataFor(owner, livemode);
    await stripeCall("Failed to update Stripe customer", () =>
      stripe.customers.update(customerId, {
        ...(deps.email ? { email: deps.email } : {}),
        ...(deps.name ? { name: deps.name } : {}),
        ...(deps.address ? { address: deps.address } : {}),
        metadata: { ...(deps.metadata ?? {}), ...ownerMetadata },
      }));
  }

  return customerId;
}

function ownerMetadataFor(owner: StripeCustomerOwner, livemode: boolean): Record<string, string> {
  return isOrgOwner(owner)
    ? { organization_id: owner.orgId, livemode: String(livemode) }
    : { user_id: owner.userId, livemode: String(livemode) };
}

async function createAndStoreCustomer(
  { stripe, supabase }: GetOrCreateStripeCustomerDeps,
  owner: StripeCustomerOwner,
  livemode: boolean,
): Promise<string> {
  const created = await stripeCall("Failed to create Stripe customer", () =>
    stripe.customers.create(
      { metadata: ownerMetadataFor(owner, livemode) },
      { idempotencyKey: idempotencyKey(owner, livemode) },
    ));

  if (!created?.id) fail("Stripe customer create returned no id", created);

  const write = await storeCustomerId(supabase, owner, livemode, created.id);
  if (write === "ok") return created.id;

  const raced = await readStoredCustomerId(supabase, owner, livemode);
  if (!raced) fail("Stripe customer store conflicted and no stored id could be re-read", owner);
  await deleteOrphan(stripe, created.id, raced);
  return raced;
}

/**
 * Read-only: the stored customer id for this owner in the mode of the Stripe
 * key, or null. Never creates a customer or calls Stripe.
 */
export async function getStoredStripeCustomerId(
  owner: StripeCustomerOwner,
  deps: { supabase: StripeCustomerStore; env?: EnvReader },
): Promise<string | null> {
  if (isOrgOwner(owner) ? !owner.orgId : !owner.userId) {
    throw new Error("getStoredStripeCustomerId requires owner.userId or owner.orgId");
  }
  return await readStoredCustomerId(deps.supabase, owner, isLiveMode(deps.env));
}
