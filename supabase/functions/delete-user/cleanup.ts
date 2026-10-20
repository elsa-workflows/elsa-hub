import type { StripeCustomerRefStore } from "./stripe_customer_refs.ts";

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

export type MembershipRow = {
  organization_id: string;
};

export type SubscriptionRow = {
  stripe_subscription_id: string;
};

export type ServiceQueryResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

export type ServiceQuery<T> = PromiseLike<ServiceQueryResult<T>> & {
  select: (columns: string) => ServiceQuery<T>;
  eq: (column: string, value: string) => ServiceQuery<T>;
  neq: (column: string, value: string) => ServiceQuery<T>;
  in: (column: string, values: string[]) => ServiceQuery<T>;
};

export type ServiceClient = {
  from: (table: string) => ServiceQuery<unknown>;
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

export function isStripeResourceMissing(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const stripeError = error as { code?: string; statusCode?: number; status?: number };
  return stripeError.code === "resource_missing" ||
    stripeError.statusCode === 404 ||
    stripeError.status === 404;
}

export async function listSoleOwnerOrganizationIds(
  serviceClient: ServiceClient,
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

// Deletes the customer stored for (kind, ownerId, livemode) and then clears the
// ref. Returns a warning when the customer was kept. Safe to run again after
// any failure: the ref is only cleared once the customer is gone from Stripe.
async function deleteCustomerByStoredRef(
  stripe: StripeCleanupClient,
  refs: StripeCustomerRefStore,
  kind: "user" | "organization",
  ownerId: string,
  livemode: boolean,
): Promise<string | undefined> {
  const customerId = await refs.getCustomerId(kind, ownerId, livemode);
  if (!customerId) return undefined;

  // Another owner still points at this customer: drop only this ref.
  if (await refs.isReferencedElsewhere(customerId, kind, ownerId, livemode)) {
    await refs.clearRef(kind, ownerId, livemode, customerId);
    return `Stripe customer ${customerId} kept: still referenced by another user or organization`;
  }

  try {
    await stripe.customers.del(customerId);
  } catch (error) {
    // Already deleted in Stripe: the ref is stale, so clear it.
    if (!isStripeResourceMissing(error)) {
      throw new StripeCustomerDeleteError(customerId, error);
    }
  }

  await refs.clearRef(kind, ownerId, livemode, customerId);
  return undefined;
}

export async function cleanupStripeCustomersForUserDelete(options: {
  serviceClient: ServiceClient;
  stripe: StripeCleanupClient;
  refs: StripeCustomerRefStore;
  userId: string;
  livemode: boolean;
}): Promise<{ warnings: string[] }> {
  const { serviceClient, stripe, refs, userId, livemode } = options;
  const warnings: string[] = [];
  const soleOwnerOrgIds = await listSoleOwnerOrganizationIds(serviceClient, userId);

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
      } catch (stripeErr) {
        console.error(
          `Failed to cancel subscription ${sub.stripe_subscription_id}:`,
          stripeErr,
        );
        warnings.push(`Failed to cancel subscription: ${sub.stripe_subscription_id}`);
      }
    }

    for (const orgId of soleOwnerOrgIds) {
      const kept = await deleteCustomerByStoredRef(
        stripe,
        refs,
        "organization",
        orgId,
        livemode,
      );
      if (kept) warnings.push(kept);
    }
  }

  const kept = await deleteCustomerByStoredRef(stripe, refs, "user", userId, livemode);
  if (kept) warnings.push(kept);
  return { warnings };
}
