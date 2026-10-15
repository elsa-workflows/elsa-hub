/**
 * Cloud billing adapter.
 *
 * Codes against:
 * - elsa-hub#47 / #57 `getOrCreateStripeCustomer(owner, deps?)` (unchanged)
 * - elsa-control#825 Hub-originated subscription metadata
 *   (`elsa_control_organization_id` on the session and subscription)
 * - cloud-bff (#53 / #44) Hub-org → Control-org mapping
 *
 * Cloud checkout is org-only. The Control organization id is derived on the
 * server from the admin-checked Hub org. Client-supplied ids are ignored.
 */

export const CLOUD_KIND = "cloud";
export const ACADEMY_KIND = "academy";
export const CLOUD_PRODUCT_TYPE = "cloud";
export const CONTROL_ORGANIZATION_METADATA_KEY = "elsa_control_organization_id";
export const HUB_ORGANIZATION_METADATA_KEY = "hub_organization_id";
export const HUB_USER_METADATA_KEY = "hub_user_id";
export const CLOUD_PRODUCT_TYPE_METADATA_KEY = "product_type";
export const KIND_METADATA_KEY = "kind";

export type StripeTrafficKind = "cloud" | "academy" | "hub";

export type CloudCheckoutMetadata = {
  [KIND_METADATA_KEY]: typeof CLOUD_KIND;
  [CLOUD_PRODUCT_TYPE_METADATA_KEY]: typeof CLOUD_PRODUCT_TYPE;
  [HUB_USER_METADATA_KEY]: string;
  [CONTROL_ORGANIZATION_METADATA_KEY]: string;
  [HUB_ORGANIZATION_METADATA_KEY]: string;
};

export type StoredStripeCustomerOwner = { userId: string } | { orgId: string };

export type StoredStripeCustomerQuery = {
  eq: (column: string, value: string | boolean) => StoredStripeCustomerQuery;
  maybeSingle: () => PromiseLike<{
    data: { stripe_customer_id: string } | null;
    error: { message: string } | null;
  }>;
};

export type StoredStripeCustomerStore = {
  from: (table: string) => {
    select: (columns: string) => StoredStripeCustomerQuery;
  };
};

export const CLOUD_SUBSCRIPTION_EXISTS_CODE = "cloud_subscription_exists";

export function isCloudCheckoutRequest(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const productType = (body as { productType?: unknown }).productType;
  const kind = (body as { kind?: unknown }).kind;
  return productType === CLOUD_PRODUCT_TYPE || kind === CLOUD_KIND;
}

export function classifyStripeMetadata(
  metadata?: Record<string, string> | null,
): StripeTrafficKind {
  if (!metadata) return "hub";
  if (metadata[KIND_METADATA_KEY] === ACADEMY_KIND) return "academy";
  if (
    metadata[KIND_METADATA_KEY] === CLOUD_KIND ||
    metadata[CLOUD_PRODUCT_TYPE_METADATA_KEY] === CLOUD_PRODUCT_TYPE
  ) {
    return "cloud";
  }
  return "hub";
}

function isStringMap(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every((entry) => typeof entry === "string");
}

export function collectStripeMetadataBags(obj: unknown, depth = 0): Record<string, string>[] {
  if (!obj || typeof obj !== "object" || depth > 6) return [];
  const rec = obj as Record<string, unknown>;
  const bags: Record<string, string>[] = [];
  if (isStringMap(rec.metadata)) bags.push(rec.metadata);

  for (const nestedKey of ["subscription_details", "parent", "price", "product"]) {
    if (rec[nestedKey]) bags.push(...collectStripeMetadataBags(rec[nestedKey], depth + 1));
  }

  const lines = rec.lines as { data?: unknown[] } | undefined;
  if (Array.isArray(lines?.data)) {
    for (const line of lines.data) bags.push(...collectStripeMetadataBags(line, depth + 1));
  }
  const items = rec.items as { data?: unknown[] } | undefined;
  if (Array.isArray(items?.data)) {
    for (const item of items.data) bags.push(...collectStripeMetadataBags(item, depth + 1));
  }
  return bags;
}

export function classifyStripeDataObject(obj: unknown): StripeTrafficKind {
  const bags = collectStripeMetadataBags(obj);
  if (bags.some((bag) => classifyStripeMetadata(bag) === "academy")) return "academy";
  if (bags.some((bag) => classifyStripeMetadata(bag) === "cloud")) return "cloud";
  return "hub";
}

export function classifyStripeEvent(event: { data?: { object?: unknown } }): StripeTrafficKind {
  return classifyStripeDataObject(event?.data?.object);
}

export function isCloudStripeEvent(event: { data?: { object?: unknown } }): boolean {
  return classifyStripeEvent(event) === "cloud";
}

/**
 * Webhook route after signature verification.
 * Order: Cloud early-return for every event type, then Academy (kind=academy)
 * inside checkout.session.* / refund, then Hub billing_type handlers.
 */
export function stripeWebhookRoute(event: {
  type?: string;
  data?: { object?: unknown };
}): StripeTrafficKind {
  if (isCloudStripeEvent(event)) return "cloud";
  if (classifyStripeEvent(event) === "academy") return "academy";
  const metadata = (event.data?.object as { metadata?: Record<string, string> } | undefined)?.metadata;
  if (metadata?.[KIND_METADATA_KEY] === ACADEMY_KIND) return "academy";
  return "hub";
}

export function requireCloudOrganizationId(organizationId?: string | null): string {
  const resolved = organizationId?.trim();
  if (!resolved) {
    throw new Error("Cloud checkout requires an organization");
  }
  return resolved;
}

/**
 * Same mapping cloud-bff (#53 / #44) uses until Hub↔Control org linking exists:
 * the Hub organization id is the Control organization named in Stripe metadata.
 * Client-supplied Control ids are ignored. Replace the identity function with
 * the linked Control id once bootstrap exposes it for a Hub org.
 */
export function controlOrganizationIdFromHubOrg(
  hubOrganizationId: string,
  _clientControlOrganizationId?: string | null,
): string {
  const resolved = hubOrganizationId.trim();
  if (!resolved) {
    throw new Error("A Control organization is required for Cloud checkout");
  }
  return resolved;
}

/** @deprecated Use controlOrganizationIdFromHubOrg. Client ids are ignored. */
export function resolveControlOrganizationId(input: {
  controlOrganizationId?: string | null;
  hubOrganizationId?: string | null;
}): string {
  return controlOrganizationIdFromHubOrg(
    requireCloudOrganizationId(input.hubOrganizationId),
    input.controlOrganizationId,
  );
}

export function buildCloudCheckoutMetadata(input: {
  hubUserId: string;
  hubOrganizationId: string;
  controlOrganizationId: string;
}): CloudCheckoutMetadata {
  return {
    [KIND_METADATA_KEY]: CLOUD_KIND,
    [CLOUD_PRODUCT_TYPE_METADATA_KEY]: CLOUD_PRODUCT_TYPE,
    [HUB_USER_METADATA_KEY]: input.hubUserId,
    [CONTROL_ORGANIZATION_METADATA_KEY]: input.controlOrganizationId,
    [HUB_ORGANIZATION_METADATA_KEY]: input.hubOrganizationId,
  };
}

export function cloudCheckoutSuccessPath(): string {
  return "/cloud?payment=success";
}

export function cloudCheckoutCancelPath(): string {
  return "/cloud/billing?payment=cancelled";
}

export function cloudPortalReturnPath(): string {
  return "/cloud/billing";
}

export function assertStripeTestMode(secretKey: string | undefined): void {
  if (!secretKey) {
    throw new Error("Cloud billing is not configured");
  }
  if (!(secretKey.startsWith("sk_test_") || secretKey.startsWith("rk_test_"))) {
    throw new Error("Cloud billing is sandbox-only");
  }
}

export function readCloudPriceId(env: { get(key: string): string | undefined } = Deno.env): string {
  const priceId = env.get("STRIPE_CLOUD_PRICE_ID") ?? env.get("CLOUD_STRIPE_PRICE_ID");
  if (!priceId) {
    throw new Error("Cloud billing is not configured");
  }
  return priceId;
}

export function cloudBillingCustomerOwner(input: {
  organizationId?: string | null;
  userId: string;
}): StoredStripeCustomerOwner {
  const organizationId = input.organizationId?.trim();
  if (organizationId) return { orgId: organizationId };
  return { userId: input.userId };
}

export function stripeLivemodeFromSecret(secretKey: string | undefined): boolean {
  return (secretKey ?? "").startsWith("sk_live_");
}

export function orgHasBlockingCloudSubscription(
  subscriptions: Array<{
    status?: string;
    metadata?: Record<string, string> | null;
  }>,
): boolean {
  return subscriptions.some((sub) => {
    if (classifyStripeDataObject(sub) !== "cloud") return false;
    return sub.status === "active" || sub.status === "trialing";
  });
}

/**
 * Read the stored Stripe customer ref only. Never lists Stripe customers by
 * email and never creates a customer. Portal and status use this.
 */
export async function readStoredStripeCustomerId(
  supabase: unknown,
  owner: StoredStripeCustomerOwner,
  livemode = false,
): Promise<string | null> {
  const isOrg = "orgId" in owner;
  const table = isOrg ? "org_stripe_customers" : "user_stripe_customers";
  const column = isOrg ? "organization_id" : "user_id";
  const value = isOrg ? owner.orgId : owner.userId;
  const store = supabase as StoredStripeCustomerStore;

  const { data, error } = await store
    .from(table)
    .select("stripe_customer_id")
    .eq(column, value)
    .eq("livemode", livemode)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read stored Stripe customer: ${error.message}`);
  }

  return data?.stripe_customer_id ?? null;
}

/**
 * Control entitlement adapter (elsa-hub#44 / elsa-control#825).
 * Returns null until cloud-bff reports Hosted entitlement for this Hub subject.
 */
export async function readControlEntitlement(_input: {
  hubUserId: string;
  hubOrganizationId?: string | null;
}): Promise<null> {
  return null;
}
