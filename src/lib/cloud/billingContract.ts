/** Hub ↔ Control Cloud billing contract. Keep in sync with supabase/functions/_shared/cloud-billing.ts */

export const CLOUD_KIND = "cloud";
export const ACADEMY_KIND = "academy";
export const CLOUD_PRODUCT_TYPE = "cloud";
export const CLOUD_SUBSCRIPTION_EXISTS_CODE = "cloud_subscription_exists";
export const CLOUD_ORG_NOT_LINKED_CODE = "cloud_org_not_linked";

/** Control's StripeBillingProvider organization correlation key (elsa-control#825). */
export const CONTROL_ORGANIZATION_METADATA_KEY = "elsa_control_organization_id";
export const HUB_ORGANIZATION_METADATA_KEY = "hub_organization_id";
export const HUB_USER_METADATA_KEY = "hub_user_id";
export const CLOUD_PRODUCT_TYPE_METADATA_KEY = "product_type";
export const KIND_METADATA_KEY = "kind";

export type StripeTrafficKind = "cloud" | "academy" | "hub";

export type CloudCheckoutRequest = {
  productType: typeof CLOUD_PRODUCT_TYPE;
  organizationId: string;
};

export type CloudCheckoutMetadata = {
  [KIND_METADATA_KEY]: typeof CLOUD_KIND;
  [CLOUD_PRODUCT_TYPE_METADATA_KEY]: typeof CLOUD_PRODUCT_TYPE;
  [HUB_USER_METADATA_KEY]: string;
  [CONTROL_ORGANIZATION_METADATA_KEY]: string;
  [HUB_ORGANIZATION_METADATA_KEY]: string;
};

export function isCloudCheckoutRequest(body: unknown): body is CloudCheckoutRequest {
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

export function classifyStripeEvent(event: { type?: string; data?: { object?: unknown } }): StripeTrafficKind {
  return classifyStripeDataObject(event?.data?.object);
}

export function shouldRecordHubOrder(event: { type?: string; data?: { object?: unknown } }): boolean {
  return classifyStripeEvent(event) === "hub";
}

export function stripeWebhookRoute(event: {
  type?: string;
  data?: { object?: unknown };
}): StripeTrafficKind {
  if (classifyStripeEvent(event) === "cloud") return "cloud";
  if (classifyStripeEvent(event) === "academy") return "academy";
  return "hub";
}

export function requireCloudOrganizationId(organizationId?: string | null): string {
  const resolved = organizationId?.trim();
  if (!resolved) {
    throw new Error("Cloud checkout requires an organization");
  }
  return resolved;
}

export type HubOrganizationMembership = {
  organization_id: string;
  role?: string;
};

export type LinkedHubOrganization =
  | { organizationId: string }
  | { status: number; error: string; code?: string };

function isAdminMembershipRole(role?: string): boolean {
  return role === "admin" || role === "owner";
}

export function selectLinkedHubOrganization(
  memberships: HubOrganizationMembership[],
  clientOrganizationId?: string | null,
): LinkedHubOrganization {
  const linkedIds = [
    ...new Set(
      memberships
        .filter((row) => isAdminMembershipRole(row.role) && row.organization_id)
        .map((row) => row.organization_id),
    ),
  ];

  if (linkedIds.length === 0) {
    return {
      status: 403,
      code: CLOUD_ORG_NOT_LINKED_CODE,
      error: "No organization is linked to this account",
    };
  }

  let requested: string;
  try {
    requested = requireCloudOrganizationId(clientOrganizationId);
  } catch (error) {
    return {
      status: 400,
      error: error instanceof Error ? error.message : "Cloud checkout requires an organization",
    };
  }

  const matched = linkedIds.find((id) => id === requested);
  if (!matched) {
    return {
      status: 403,
      code: CLOUD_ORG_NOT_LINKED_CODE,
      error: "No organization is linked to this account",
    };
  }

  return { organizationId: matched };
}

export type ControlOrganizationLinkRow = {
  control_organization_id?: string | null;
  validated_at?: string | null;
};

export function controlOrganizationIdFromLink(
  row: ControlOrganizationLinkRow | null | undefined,
): string | null {
  const id = row?.control_organization_id?.trim();
  if (!id || !row?.validated_at) return null;
  return id;
}

export function unlinkedControlOrganizationError(): {
  status: number;
  error: string;
  code: typeof CLOUD_ORG_NOT_LINKED_CODE;
} {
  return {
    status: 403,
    code: CLOUD_ORG_NOT_LINKED_CODE,
    error: "No organization is linked to this account",
  };
}

export function cloudLinkFromControlOrganizationId(
  controlOrganizationId: string | null | undefined,
): "linked" | "missing" {
  return controlOrganizationId ? "linked" : "missing";
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

export function canStartOrgCloudCheckout(isOrgAdmin: boolean): boolean {
  return isOrgAdmin === true;
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

export function cloudBillingCustomerOwner(input: {
  organizationId?: string | null;
  userId: string;
}): { userId: string } | { orgId: string } {
  const organizationId = input.organizationId?.trim();
  if (organizationId) return { orgId: organizationId };
  return { userId: input.userId };
}
