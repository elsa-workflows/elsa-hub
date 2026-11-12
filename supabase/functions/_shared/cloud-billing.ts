/**
 * Cloud billing adapter.
 *
 * Codes against:
 * - #57 `_shared/stripe-customer.ts`: `getOrCreateStripeCustomer` (checkout),
 *   `getStoredStripeCustomerId` (portal and status, read-only),
 *   `stripeKeyMode` and `customerFailureResponse`
 * - elsa-control#825 Hub-originated subscription metadata
 *   (`elsa_control_organization_id` on the session and subscription)
 * - #79 `readValidatedControlOrganizationId` from `cloud_organization_links`
 *   (Control org id for checkout metadata)
 *
 * Cloud billing is org-only. The Hub organization is the one the request
 * names, admitted by `is_org_admin` (checkout, portal) or `is_org_member`
 * (status). The Control organization id comes from #79's validated link row
 * for that org, never from the Hub org id or the client.
 */

import type { ControlFetch } from "./cloud-control.ts";
import { isGuid } from "./cloud-types.ts";
import { type EnvReader, stripeKeyMode } from "./stripe-customer.ts";

export const CLOUD_KIND = "cloud";
export const ACADEMY_KIND = "academy";
export const CLOUD_PRODUCT_TYPE = "cloud";
export const CONTROL_ORGANIZATION_METADATA_KEY = "elsa_control_organization_id";
export const HUB_ORGANIZATION_METADATA_KEY = "hub_organization_id";
export const HUB_USER_METADATA_KEY = "hub_user_id";
export const CLOUD_PRODUCT_TYPE_METADATA_KEY = "product_type";
export const CLOUD_PRICE_ID_METADATA_KEY = "cloud_price_id";
export const KIND_METADATA_KEY = "kind";

export type StripeTrafficKind = "cloud" | "academy" | "hub";

export type CloudCheckoutMetadata = {
  [KIND_METADATA_KEY]: typeof CLOUD_KIND;
  [CLOUD_PRODUCT_TYPE_METADATA_KEY]: typeof CLOUD_PRODUCT_TYPE;
  [HUB_USER_METADATA_KEY]: string;
  [CONTROL_ORGANIZATION_METADATA_KEY]: string;
  [HUB_ORGANIZATION_METADATA_KEY]: string;
  [CLOUD_PRICE_ID_METADATA_KEY]: string;
};

export const CLOUD_SUBSCRIPTION_EXISTS_CODE = "cloud_subscription_exists";
export const CLOUD_ORG_NOT_LINKED_CODE = "cloud_org_not_linked";
export const CLOUD_BILLING_UNAVAILABLE_CODE = "billing_unavailable";
export const CLOUD_ORGANIZATION_REQUIRED = "Cloud billing requires an organization";
export const CLOUD_LINK_READ_FAILED =
  "We couldn't check this organization's Elsa Cloud link. Refresh this page to check again.";
export const CLOUD_CHECKOUT_FAILED = "We couldn't start Elsa Cloud checkout. Please try again.";
export const CLOUD_SUBSCRIPTION_SUSPENDED_CODE = "cloud_subscription_suspended";
export const CLOUD_SUBSCRIPTION_SUSPENDED_MESSAGE = "Your Elsa Cloud plan isn't active. For help, email hello@valence.works.";
export const CLOUD_ENTITLEMENT_UNAVAILABLE_CODE = "cloud_entitlement_unavailable";
export const CLOUD_ENTITLEMENT_UNAVAILABLE_MESSAGE = "We couldn't load billing. Refresh this page to check again.";
/** #960 recoveryAction value that reopens Cloud checkout for a Suspended org. */
export const CONTROL_RECOVERY_ACTION_SUBSCRIBE = "Subscribe";
/**
 * Checkout never-subscribed marker. Matched exactly; Control's current
 * `HostedSubscriptionManagementActions.NoBillingLinkage` wire value is
 * `no-billing-linkage` and will not satisfy this check until Control aligns.
 */
export const CONTROL_NO_BILLING_LINKAGE_ACTION = "NoBillingLinkage";
/** Plan label until Control reports a more specific Hosted product name. */
export const CLOUD_PLAN_NAME = "Elsa Cloud";

/** A Cloud checkout or portal request, as opposed to the Hub's own billing. */
export function isCloudRequest(body: unknown): boolean {
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

/** The trimmed organization id, or null when the request names none (personal mode). */
export function cloudOrganizationIdFromBody(body: unknown): string | null {
  const raw = (body as { organizationId?: unknown } | null | undefined)?.organizationId;
  const organizationId = typeof raw === "string" ? raw.trim() : "";
  return organizationId || null;
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
  priceId: string;
}): CloudCheckoutMetadata {
  return {
    [KIND_METADATA_KEY]: CLOUD_KIND,
    [CLOUD_PRODUCT_TYPE_METADATA_KEY]: CLOUD_PRODUCT_TYPE,
    [HUB_USER_METADATA_KEY]: input.hubUserId,
    [CONTROL_ORGANIZATION_METADATA_KEY]: input.controlOrganizationId,
    [HUB_ORGANIZATION_METADATA_KEY]: input.hubOrganizationId,
    [CLOUD_PRICE_ID_METADATA_KEY]: input.priceId,
  };
}

/** An open Checkout Session as Stripe lists it; the real client satisfies it. */
export type OpenCheckoutSession = {
  id: string;
  url: string | null;
  success_url?: string | null;
  /** Unix seconds. */
  expires_at: number;
  metadata?: Record<string, string> | null;
};

/** The Checkout Session calls Cloud checkout and the webhook use to find and close open Cloud sessions. */
export type CloudCheckoutSessions = {
  list(params: { customer: string; status: "open"; limit?: number }): Promise<{ data: OpenCheckoutSession[] }>;
  expire(id: string): Promise<unknown>;
};

/** The customer's open Cloud Checkout Sessions, from the first 100 open sessions. */
export async function listOpenCloudCheckoutSessions(
  sessions: CloudCheckoutSessions,
  customer: string,
): Promise<OpenCheckoutSession[]> {
  const open = await sessions.list({ customer, status: "open", limit: 100 });
  return open.data.filter((session) => classifyStripeDataObject(session) === "cloud");
}

/**
 * Expires a Checkout Session. A failure is logged, not thrown: the usual cause
 * is a session that completed or expired after it was listed, and Stripe
 * refuses to expire a session that is no longer open. Any other leftover
 * closes on its own within the 31-minute session lifetime.
 */
export async function expireCheckoutSession(sessions: CloudCheckoutSessions, id: string): Promise<void> {
  try {
    await sessions.expire(id);
  } catch (error) {
    console.error(`Could not expire Cloud Checkout Session ${id}:`, error);
  }
}

/**
 * Expire open Cloud Checkout Sessions for a stored customer. Used when
 * Control is Suspended or Retained so a leftover session cannot be paid.
 * A missing customer is a no-op. Failures to expire a single session are
 * already swallowed by `expireCheckoutSession`.
 */
export async function expireOpenCloudSessionsForCustomer(
  sessions: CloudCheckoutSessions,
  customerId: string | null | undefined,
): Promise<void> {
  if (!customerId) return;
  const open = await listOpenCloudCheckoutSessions(sessions, customerId);
  for (const session of open) {
    await expireCheckoutSession(sessions, session.id);
  }
}

/**
 * Return paths name the org that was billed, so an admin of several orgs lands
 * on that org's Cloud pages. Without a slug they fall back to the legacy
 * `/cloud` routes, which pick an org on the client.
 */
function cloudHomePath(orgSlug?: string | null): string {
  return orgSlug ? `/dashboard/org/${encodeURIComponent(orgSlug)}/cloud` : "/cloud";
}

export function cloudCheckoutSuccessPath(orgSlug?: string | null): string {
  return `${cloudHomePath(orgSlug)}?payment=success`;
}

export function cloudCheckoutCancelPath(orgSlug?: string | null): string {
  return `${cloudHomePath(orgSlug)}/billing?payment=cancelled`;
}

export function cloudPortalReturnPath(orgSlug?: string | null): string {
  return `${cloudHomePath(orgSlug)}/billing`;
}

/** Operator switch. A live Stripe key is allowed only when this is exactly `true`. */
export const CLOUD_BILLING_LIVE_ENABLED_KEY = "CLOUD_BILLING_LIVE_ENABLED";

export function isCloudBillingLiveEnabled(value: string | undefined | null): boolean {
  return value === "true";
}

export type CloudBillingUnavailablePayload = {
  error: string;
  code: typeof CLOUD_BILLING_UNAVAILABLE_CODE;
};

/** 503 JSON for a Cloud billing gate. The Stripe key never appears here. */
export function cloudBillingUnavailablePayload(error: Error): CloudBillingUnavailablePayload {
  return { error: error.message, code: CLOUD_BILLING_UNAVAILABLE_CODE };
}

/**
 * A test key is always allowed. A live key is allowed only when
 * CLOUD_BILLING_LIVE_ENABLED is exactly `true`. Unset or any other value
 * keeps the sandbox-only 503. The key never appears in the thrown message.
 */
export function assertStripeTestMode(
  secretKey: string | undefined,
  env?: EnvReader,
): void {
  let mode: "live" | "test";
  try {
    mode = stripeKeyMode(secretKey ?? "");
  } catch {
    throw new Error("Cloud billing is not configured");
  }
  if (mode === "test") return;
  if (isCloudBillingLiveEnabled(env?.get(CLOUD_BILLING_LIVE_ENABLED_KEY))) return;
  throw new Error("Cloud billing is sandbox-only");
}

export function readCloudPriceId(env: EnvReader = Deno.env): string {
  const priceId = env.get("STRIPE_CLOUD_PRICE_ID") ?? env.get("CLOUD_STRIPE_PRICE_ID");
  if (!priceId) {
    throw new Error("Cloud billing is not configured");
  }
  return priceId;
}

/**
 * Statuses after which a subscription can no longer bill or be reactivated.
 * src/lib/cloud/billingContract.ts mirrors this list for the billing page.
 */
export const ENDED_SUBSCRIPTION_STATUSES: readonly string[] = ["canceled", "incomplete_expired"];

/**
 * Any Cloud subscription that has not ended blocks a second checkout:
 * past_due, unpaid, paused and incomplete ones still bill or can resume, so
 * the admin is sent to the portal instead.
 */
export function orgHasBlockingCloudSubscription(
  subscriptions: Array<{
    status?: string;
    metadata?: Record<string, string> | null;
  }>,
): boolean {
  return subscriptions.some((sub) =>
    classifyStripeDataObject(sub) === "cloud" &&
    !ENDED_SUBSCRIPTION_STATUSES.includes(sub.status ?? "")
  );
}

/**
 * True when this customer has ever had an Elsa Cloud subscription, including
 * canceled and incomplete_expired. Used on Control 404 so a first subscribe
 * is allowed only when there is no earlier Cloud subscription.
 */
export function orgHasAnyCloudSubscription(
  subscriptions: Array<{
    status?: string;
    metadata?: Record<string, string> | null;
  }>,
): boolean {
  return subscriptions.some((sub) => classifyStripeDataObject(sub) === "cloud");
}

/**
 * Control Hosted subscription states that still entitle the organization
 * (`OrganizationSubscriptionLifecycle.IsLive` on valence-works/elsa-control#825).
 * Mapped to the Hub billing page's Stripe-style status strings.
 */
const CONTROL_LIVE_SUBSCRIPTION_STATUS: Record<string, string> = {
  trial: "trialing",
  trialing: "trialing",
  active: "active",
  pastdue: "past_due",
  constrained: "constrained",
  suspended: "paused",
};

export type CloudControlEntitlement = {
  planName: string;
  status: string;
  source: "hub" | "control" | null;
};

export type ReadControlEntitlementInput = {
  accessToken?: string;
  controlOrganizationId: string | null;
  controlFetch?: ControlFetch;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function readStringField(record: Record<string, unknown>, ...names: string[]): string | null {
  for (const name of names) {
    const value = record[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function hubStatusFromControlState(state: string): string | null {
  return CONTROL_LIVE_SUBSCRIPTION_STATUS[state.toLowerCase()] ?? null;
}

function entitlementSource(value: string | null): CloudControlEntitlement["source"] {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === "hub" || normalized === "control") return normalized;
  return null;
}

/**
 * The plan Hub shows once Control reports a live Hosted subscription
 * (`GET /api/organizations/{id}/billing/hosted-subscription`, elsa-control#825).
 * Retained/Deleted/missing states, and any unrecognised body, are not a plan.
 */
export function normalizeControlEntitlement(body: unknown): CloudControlEntitlement | null {
  const record = asRecord(body);
  if (!record) return null;
  const status = hubStatusFromControlState(
    readStringField(record, "subscriptionState", "SubscriptionState") ?? "",
  );
  if (!status) return null;
  return {
    planName: CLOUD_PLAN_NAME,
    status,
    source: entitlementSource(readStringField(record, "source", "Source")),
  };
}

export type ControlHostedSubscriptionRead = {
  entitlement: CloudControlEntitlement | null;
  subscriptionState: string | null;
  recoveryAction: string | null;
};

/**
 * Billing-page read of Control's Hosted subscription. Failures return a
 * null entitlement so Stripe status on `/cloud/billing` still loads. The
 * raw state is included so a Suspended or Retained result can expire open
 * Cloud Checkout Sessions without a second Control call.
 */
export async function readControlHostedSubscription(
  input: ReadControlEntitlementInput,
): Promise<ControlHostedSubscriptionRead> {
  const empty = { entitlement: null, subscriptionState: null, recoveryAction: null };
  const { accessToken, controlOrganizationId, controlFetch } = input;
  if (!accessToken || !controlFetch || !controlOrganizationId || !isGuid(controlOrganizationId)) {
    return empty;
  }

  const result = await controlFetch({
    method: "GET",
    path: `/api/organizations/${controlOrganizationId}/billing/hosted-subscription`,
    action: "hostedSubscription",
  }, accessToken);
  if (!result.ok) return empty;
  const record = asRecord(result.body);
  return {
    entitlement: normalizeControlEntitlement(result.body),
    subscriptionState: record && readStringField(record, "subscriptionState", "SubscriptionState"),
    recoveryAction: record ? readStringField(record, "recoveryAction", "RecoveryAction") : null,
  };
}

/**
 * Hub read of Control's Hosted subscription for the linked Control organization.
 * Failures (outage, 404, forbidden, unrecognised body) return null so Stripe
 * status on `/cloud/billing` still loads. The Control org id comes from the
 * validated link, never from the client.
 */
export async function readControlEntitlement(
  input: ReadControlEntitlementInput,
): Promise<CloudControlEntitlement | null> {
  return (await readControlHostedSubscription(input)).entitlement;
}

export type ControlCheckoutEntitlement =
  | { ok: true; subscriptionState: string | null; recoveryAction: string | null }
  | { ok: false };

function ownField(record: Record<string, unknown>, ...names: string[]): { present: boolean; value: unknown } {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(record, name)) {
      return { present: true, value: record[name] };
    }
  }
  return { present: false, value: undefined };
}

function sameControlOrganizationId(value: unknown, expected: string): boolean {
  return typeof value === "string" && isGuid(value.trim()) &&
    value.trim().toLowerCase() === expected.trim().toLowerCase();
}

/**
 * Control's never-subscribed 200: an object with `organizationId` equal to
 * the requested Control org, `subscriptionState` present and null,
 * `billingLinked` === false, and `managementAction` === `NoBillingLinkage`.
 * A missing or undefined `subscriptionState` is not accepted.
 */
export function isControlNeverSubscribedBody(
  body: unknown,
  controlOrganizationId: string,
): boolean {
  const record = asRecord(body);
  if (!record) return false;
  const organizationId = ownField(record, "organizationId", "OrganizationId");
  const subscriptionState = ownField(record, "subscriptionState", "SubscriptionState");
  const billingLinked = ownField(record, "billingLinked", "BillingLinked");
  const managementAction = ownField(record, "managementAction", "ManagementAction");
  return sameControlOrganizationId(organizationId.value, controlOrganizationId) &&
    subscriptionState.present && subscriptionState.value === null &&
    billingLinked.value === false &&
    managementAction.value === CONTROL_NO_BILLING_LINKAGE_ACTION;
}

/**
 * Checkout read of Control's Hosted subscription. Unlike
 * `readControlEntitlement`, this fails closed on a Control error or timeout
 * (`ok: false`). A 200 is a first-subscribe candidate only when it matches
 * `isControlNeverSubscribedBody`. Any other 200 without a non-empty
 * `subscriptionState` is `ok: false`. A 404, or that never-subscribed 200,
 * is `ok: true` with a null state; checkout then allows a first subscribe
 * only when Stripe has no earlier Cloud subscription for the org.
 */
export async function readControlCheckoutEntitlement(
  input: ReadControlEntitlementInput,
): Promise<ControlCheckoutEntitlement> {
  const { accessToken, controlOrganizationId, controlFetch } = input;
  if (!accessToken || !controlFetch || !controlOrganizationId || !isGuid(controlOrganizationId)) {
    return { ok: false };
  }

  let result;
  try {
    result = await controlFetch({
      method: "GET",
      path: `/api/organizations/${controlOrganizationId}/billing/hosted-subscription`,
      action: "hostedSubscription",
    }, accessToken);
  } catch {
    return { ok: false };
  }
  if (!result.ok) {
    if (result.kind === "not_found") {
      return { ok: true, subscriptionState: null, recoveryAction: null };
    }
    return { ok: false };
  }
  const record = asRecord(result.body);
  const subscriptionState = record && readStringField(record, "subscriptionState", "SubscriptionState");
  if (subscriptionState) {
    return {
      ok: true,
      subscriptionState,
      recoveryAction: readStringField(record, "recoveryAction", "RecoveryAction"),
    };
  }
  if (isControlNeverSubscribedBody(result.body, controlOrganizationId)) {
    return { ok: true, subscriptionState: null, recoveryAction: null };
  }
  return { ok: false };
}

/**
 * Suspended blocks Cloud checkout unless #960's `recoveryAction` is exactly
 * `Subscribe` (a missing field is blocked). Retained always blocks;
 * `Subscribe` must not let it through (elsa-control#960 AC4). Deleted is
 * not blocked; a first-time or resubscribe path may proceed.
 */
export function controlSubscriptionBlocksCheckout(
  subscriptionState: string | null,
  recoveryAction: string | null,
): boolean {
  const state = (subscriptionState ?? "").toLowerCase();
  if (state === "retained") return true;
  if (state !== "suspended") return false;
  return recoveryAction !== CONTROL_RECOVERY_ACTION_SUBSCRIBE;
}
