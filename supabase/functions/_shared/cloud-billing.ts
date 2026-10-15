/**
 * Cloud billing adapter.
 *
 * Codes against:
 * - elsa-hub#47 `getOrCreateStripeCustomer(owner, deps?)`
 * - elsa-control#825 Hub-originated subscription metadata
 *   (`elsa_control_organization_id` on the session and subscription)
 *
 * When those PRs land, keep the exports below and drop the local fallbacks
 * documented next to each function.
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
  [HUB_ORGANIZATION_METADATA_KEY]?: string;
};

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
 * Until elsa-control#825 maps Hub orgs to Control orgs, Hub org id is the
 * Control organization named in subscription metadata. Once linking lands,
 * pass the Control id through `controlOrganizationId`.
 */
export function resolveControlOrganizationId(input: {
  controlOrganizationId?: string | null;
  hubOrganizationId?: string | null;
}): string {
  const resolved = input.controlOrganizationId?.trim() || input.hubOrganizationId?.trim();
  if (!resolved) {
    throw new Error("A Control organization is required for Cloud checkout");
  }
  return resolved;
}

export function buildCloudCheckoutMetadata(input: {
  hubUserId: string;
  hubOrganizationId?: string | null;
  controlOrganizationId: string;
}): CloudCheckoutMetadata {
  const metadata: CloudCheckoutMetadata = {
    [KIND_METADATA_KEY]: CLOUD_KIND,
    [CLOUD_PRODUCT_TYPE_METADATA_KEY]: CLOUD_PRODUCT_TYPE,
    [HUB_USER_METADATA_KEY]: input.hubUserId,
    [CONTROL_ORGANIZATION_METADATA_KEY]: input.controlOrganizationId,
  };
  if (input.hubOrganizationId) {
    metadata[HUB_ORGANIZATION_METADATA_KEY] = input.hubOrganizationId;
  }
  return metadata;
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
  if (secretKey.startsWith("sk_live_")) {
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
