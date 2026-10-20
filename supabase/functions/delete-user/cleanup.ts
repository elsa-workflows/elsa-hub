import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import type {
  StripeCustomerRefKind,
  StripeCustomerRefStore,
} from "./stripe_customer_refs.ts";

export type StripeCleanupClient = {
  customers: {
    del: (customerId: string) => Promise<unknown>;
  };
  subscriptions: {
    cancel: (
      subscriptionId: string,
      opts?: { invoice_now?: boolean; prorate?: boolean },
    ) => Promise<unknown>;
  };
};

type MembershipRow = {
  organization_id: string;
};

type SubscriptionRow = {
  stripe_subscription_id: string;
};

function stripeErrorDetail(cause: unknown): string {
  if (cause instanceof Error && cause.message) return cause.message;
  if (cause && typeof cause === "object" && "message" in cause) {
    const message = (cause as { message: unknown }).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return "Stripe customer delete failed";
}

export class StripeCustomerDeleteError extends Error {
  readonly customerId: string;

  constructor(customerId: string, cause?: unknown) {
    super(`Stripe customer delete failed for ${customerId}: ${stripeErrorDetail(cause)}`);
    this.name = "StripeCustomerDeleteError";
    this.customerId = customerId;
  }
}

// Stripe answers 404 resource_missing both for a customer that is gone and for
// one that exists in the other mode ("a similar object exists in live mode").
// The second is a wrong-mode key, not a stale ref, so it must not count as gone.
const WRONG_MODE_PATTERN = /exists in (live|test) mode/i;

// Thrown instead of running the delete when refs exist but no Stripe key can
// reach their customers.
export class StripeNotConfiguredError extends Error {
  constructor(customerIds: string[]) {
    super(
      `STRIPE_SECRET_KEY is not configured and Stripe customers are still stored (${
        customerIds.join(", ")
      }); configure the key and retry so they can be deleted first`,
    );
    this.name = "StripeNotConfiguredError";
  }
}

function isStripeResourceMissing(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const stripeError = error as {
    code?: string;
    statusCode?: number;
    status?: number;
    message?: unknown;
  };
  if (
    typeof stripeError.message === "string" &&
    WRONG_MODE_PATTERN.test(stripeError.message)
  ) {
    return false;
  }
  return stripeError.code === "resource_missing" ||
    stripeError.statusCode === 404 ||
    stripeError.status === 404;
}

type StripeRef = {
  kind: StripeCustomerRefKind;
  ownerId: string;
  livemode: boolean;
  customerId: string;
};

// Reads (never deletes) the refs the user and the given organizations hold in
// the given modes.
async function listStripeRefs(
  refs: StripeCustomerRefStore,
  userId: string,
  organizationIds: string[],
  livemodes: boolean[],
): Promise<StripeRef[]> {
  const owners = [
    { kind: "user" as const, ownerId: userId },
    ...organizationIds.map((ownerId) => ({ kind: "organization" as const, ownerId })),
  ];
  const found: StripeRef[] = [];
  for (const { kind, ownerId } of owners) {
    for (const livemode of livemodes) {
      const customerId = await refs.getCustomerId(kind, ownerId, livemode);
      if (customerId) found.push({ kind, ownerId, livemode, customerId });
    }
  }
  return found;
}

export async function listSoleOwnerOrganizationIds(
  serviceClient: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const owned = await serviceClient
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("role", "owner");

  if (owned.error) {
    throw new Error(owned.error.message);
  }

  const ownedRows = (owned.data ?? []) as MembershipRow[];
  if (ownedRows.length === 0) return [];

  const orgIds = ownedRows.map((row) => row.organization_id);
  const others = await serviceClient
    .from("organization_members")
    .select("organization_id")
    .in("organization_id", orgIds)
    .neq("user_id", userId)
    .eq("role", "owner");

  if (others.error) {
    throw new Error(others.error.message);
  }

  const orgsWithOtherOwners = new Set(
    ((others.data ?? []) as MembershipRow[]).map((row) => row.organization_id),
  );
  return orgIds.filter((id) => !orgsWithOtherOwners.has(id));
}

type RefOutcome = { customerId: string; outcome: "kept" | "deleted" };

// Deletes the customer stored for (kind, ownerId, livemode) and then clears the
// ref. Safe to run again after any failure: the ref is only cleared once the
// customer is gone from Stripe.
async function deleteCustomerByStoredRef(
  stripe: StripeCleanupClient,
  refs: StripeCustomerRefStore,
  kind: StripeCustomerRefKind,
  ownerId: string,
  livemode: boolean,
): Promise<RefOutcome | undefined> {
  const customerId = await refs.getCustomerId(kind, ownerId, livemode);
  if (!customerId) return undefined;

  // Another owner still points at this customer: drop only this ref.
  if (await refs.isReferencedElsewhere(customerId, kind, ownerId, livemode)) {
    await refs.clearRef(kind, ownerId, livemode, customerId);
    return { customerId, outcome: "kept" };
  }

  try {
    await stripe.customers.del(customerId);
    console.log(`Deleted Stripe customer ${customerId}`);
  } catch (error) {
    // Already deleted in Stripe: the ref is stale, so clear it.
    if (!isStripeResourceMissing(error)) {
      throw new StripeCustomerDeleteError(customerId, error);
    }
  }

  await refs.clearRef(kind, ownerId, livemode, customerId);
  return { customerId, outcome: "deleted" };
}

export async function cleanupStripeCustomersForUserDelete(options: {
  serviceClient: SupabaseClient;
  stripe: StripeCleanupClient;
  refs: StripeCustomerRefStore;
  userId: string;
  livemode: boolean;
}): Promise<{ warnings: string[] }> {
  const { serviceClient, stripe, refs, userId, livemode } = options;
  const warnings: string[] = [];
  const soleOwnerOrgIds = await listSoleOwnerOrganizationIds(serviceClient, userId);

  // The key only reaches its own mode. Refs in the other mode are left alone,
  // but the cascade drops them, so name the customers that stay behind.
  // A customer is named once, and only when no ref outside the user and the
  // sole-owned orgs holds it: that holder keeps the customer alive, so nothing
  // is lost. The ref tables are unique per table, so at most one user ref and
  // one org ref share a customer: two refs in our set means no outside holder.
  const heldByCustomer = new Map<string, StripeRef[]>();
  for (const ref of await listStripeRefs(refs, userId, soleOwnerOrgIds, [!livemode])) {
    heldByCustomer.set(ref.customerId, [...(heldByCustomer.get(ref.customerId) ?? []), ref]);
  }
  for (const [customerId, held] of heldByCustomer) {
    const [ref] = held;
    if (
      held.length === 1 &&
      await refs.isReferencedElsewhere(customerId, ref.kind, ref.ownerId, ref.livemode)
    ) {
      continue;
    }
    warnings.push(
      `Stripe customer ${customerId} (${ref.livemode ? "live" : "test"} mode) ` +
        "is not cleaned up: the configured key is for the other mode, and the database " +
        "cascade drops its ref",
    );
  }
  const outcomes: RefOutcome[] = [];

  if (soleOwnerOrgIds.length > 0) {
    const subs = await serviceClient
      .from("subscriptions")
      .select("stripe_subscription_id")
      .in("organization_id", soleOwnerOrgIds)
      .eq("status", "active");

    if (subs.error) {
      throw new Error(subs.error.message);
    }

    for (const sub of (subs.data ?? []) as SubscriptionRow[]) {
      try {
        await stripe.subscriptions.cancel(sub.stripe_subscription_id, {
          invoice_now: true,
          prorate: true,
        });
        console.log(`Canceled Stripe subscription ${sub.stripe_subscription_id}`);
      } catch (stripeErr) {
        console.error(
          `Failed to cancel subscription ${sub.stripe_subscription_id}:`,
          stripeErr,
        );
        warnings.push(`Failed to cancel subscription: ${sub.stripe_subscription_id}`);
      }
    }

    for (const orgId of soleOwnerOrgIds) {
      const outcome = await deleteCustomerByStoredRef(
        stripe,
        refs,
        "organization",
        orgId,
        livemode,
      );
      if (outcome) outcomes.push(outcome);
    }
  }

  const userOutcome = await deleteCustomerByStoredRef(stripe, refs, "user", userId, livemode);
  if (userOutcome) outcomes.push(userOutcome);

  // A customer shared by a deleted org and the user is kept on the org step but
  // deleted on the user step, so only warn for customers that ended up kept.
  const deletedIds = new Set(
    outcomes.filter((o) => o.outcome === "deleted").map((o) => o.customerId),
  );
  const keptIds = new Set(
    outcomes.filter((o) => o.outcome === "kept" && !deletedIds.has(o.customerId))
      .map((o) => o.customerId),
  );
  for (const customerId of keptIds) {
    const warning =
      `Stripe customer ${customerId} kept: still referenced by another user or organization`;
    console.log(warning);
    warnings.push(warning);
  }
  return { warnings };
}

// Without a Stripe key nothing can be cleaned up. The cascade would drop refs
// whose customers stay in Stripe unreachable, so refuse when any ref (either
// mode) exists for the user or a sole-owned organization.
export async function assertNoStripeRefsWithoutKey(options: {
  serviceClient: SupabaseClient;
  refs: StripeCustomerRefStore;
  userId: string;
}): Promise<void> {
  const { serviceClient, refs, userId } = options;
  const existing = await listStripeRefs(
    refs,
    userId,
    await listSoleOwnerOrganizationIds(serviceClient, userId),
    [true, false],
  );
  if (existing.length > 0) {
    throw new StripeNotConfiguredError(existing.map((ref) => ref.customerId));
  }
}
