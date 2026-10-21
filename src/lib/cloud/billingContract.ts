/**
 * The Cloud billing values the client sends or branches on. The server-side
 * contract (metadata, webhook routing, checkout rules) lives only in
 * supabase/functions/_shared/cloud-billing.ts; billingContract.test.ts checks
 * these values against it.
 */

export const CLOUD_PRODUCT_TYPE = "cloud";
export const CLOUD_SUBSCRIPTION_EXISTS_CODE = "cloud_subscription_exists";
export const CLOUD_ORGANIZATION_REQUIRED = "Cloud billing requires an organization";
