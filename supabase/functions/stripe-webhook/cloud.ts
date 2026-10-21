/**
 * Cloud Stripe events are owned by Control (elsa-control#825).
 * Hub must not record them as orders, credits, or Hub subscriptions.
 * Academy events (`kind=academy`) are not Cloud and are left for #54.
 *
 * The one thing Hub does with a Cloud event is close its own leftovers: when a
 * Cloud checkout completes, the customer's other open Cloud Checkout Sessions
 * are expired. Checkout reuses an open session, but two requests at the same
 * moment can each open one, and neither should stay payable once the org has
 * a subscription.
 */
import {
  type CloudCheckoutSessions,
  expireCheckoutSession,
  isCloudStripeEvent,
  listOpenCloudCheckoutSessions,
} from "../_shared/cloud-billing.ts";

export { isCloudStripeEvent };

export type CloudWebhookStripe = { checkout: { sessions: CloudCheckoutSessions } };

type CloudStripeEvent = {
  type?: string;
  data?: { object?: unknown };
};

function customerId(customer: unknown): string | null {
  if (typeof customer === "string") return customer || null;
  const id = (customer as { id?: unknown } | null | undefined)?.id;
  return typeof id === "string" && id ? id : null;
}

export async function handleCloudStripeEvent(
  event: CloudStripeEvent,
  stripe: CloudWebhookStripe,
): Promise<void> {
  console.log(
    `Cloud Stripe event ${event.type ?? "unknown"} left for Control; Hub orders and credits unchanged`,
  );
  if (event.type !== "checkout.session.completed") return;

  const customer = customerId((event.data?.object as { customer?: unknown } | undefined)?.customer);
  if (!customer) return;

  // Best effort: a Stripe hiccup here must not fail the webhook, and any
  // session left open still closes within its 31-minute lifetime.
  try {
    const sessions = stripe.checkout.sessions;
    for (const open of await listOpenCloudCheckoutSessions(sessions, customer)) {
      await expireCheckoutSession(sessions, open.id);
    }
  } catch (error) {
    console.error(`Could not list open Cloud Checkout Sessions for ${customer}:`, error);
  }
}
