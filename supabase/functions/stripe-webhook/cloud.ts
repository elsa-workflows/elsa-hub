/**
 * Cloud Stripe events are owned by Control (elsa-control#825).
 * Hub must not record them as orders, credits, or Hub subscriptions.
 * Academy events (`kind=academy`) are not Cloud and are left for #39.
 */
import { classifyStripeEvent, isCloudStripeEvent } from "../_shared/cloud-billing.ts";

export { isCloudStripeEvent };

export async function handleCloudStripeEvent(event: { id?: string; type?: string }): Promise<void> {
  console.log(
    `Cloud Stripe event ${event.type ?? "unknown"} left for Control; Hub orders and credits unchanged`,
  );
}

export function cloudWebhookDecision(event: { data?: { object?: unknown } }): "cloud" | "academy" | "hub" {
  return classifyStripeEvent(event);
}
