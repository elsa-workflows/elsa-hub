/**
 * Stripe webhook routing after signature verification.
 *
 * Order: Cloud early-return for every event type, then #54 Academy handlers
 * (handleAcademyCheckout / handleAcademyAsyncPaymentFailed / handleAcademyRefund),
 * then Hub billing_type handlers.
 */
import type Stripe from "https://esm.sh/stripe@18.5.0";
import { handleCloudStripeEvent, isCloudStripeEvent } from "./cloud.ts";
import {
  handleAcademyAsyncPaymentFailed,
  handleAcademyCheckout,
  handleAcademyRefund,
} from "./academy.ts";

export type StripeWebhookKind = "cloud" | "academy" | "hub";

export type StripeWebhookEvent = {
  type: string;
  data: { object: unknown };
};

export type HubWebhookHandlers = {
  onCheckoutCompleted: (
    session: Stripe.Checkout.Session,
    billingType: string | undefined,
  ) => Promise<void>;
  onCheckoutExpired: (session: Stripe.Checkout.Session) => Promise<void>;
  onInvoicePaid: (invoice: Stripe.Invoice) => Promise<void>;
  onSubscriptionUpdated: (subscription: Stripe.Subscription) => Promise<void>;
  onSubscriptionDeleted: (subscription: Stripe.Subscription) => Promise<void>;
  onChargeRefunded: (charge: Stripe.Charge) => Promise<void>;
};

export async function dispatchStripeWebhookEvent(
  event: StripeWebhookEvent,
  deps: {
    supabase: unknown;
    stripe: unknown;
    hub: HubWebhookHandlers;
  },
): Promise<StripeWebhookKind> {
  if (isCloudStripeEvent(event)) {
    await handleCloudStripeEvent(event);
    return "cloud";
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.kind === "academy") {
      await handleAcademyCheckout(deps.supabase as never, session);
      return "academy";
    }
    await deps.hub.onCheckoutCompleted(session, session.metadata?.billing_type);
    return "hub";
  }

  if (event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.kind === "academy") {
      await handleAcademyCheckout(deps.supabase as never, session);
      return "academy";
    }
    return "hub";
  }

  if (event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.kind === "academy") {
      handleAcademyAsyncPaymentFailed(session);
      return "academy";
    }
    return "hub";
  }

  if (event.type === "checkout.session.expired") {
    await deps.hub.onCheckoutExpired(event.data.object as Stripe.Checkout.Session);
    return "hub";
  }

  if (event.type === "invoice.paid") {
    await deps.hub.onInvoicePaid(event.data.object as Stripe.Invoice);
    return "hub";
  }

  if (event.type === "customer.subscription.updated") {
    await deps.hub.onSubscriptionUpdated(event.data.object as Stripe.Subscription);
    return "hub";
  }

  if (event.type === "customer.subscription.deleted") {
    await deps.hub.onSubscriptionDeleted(event.data.object as Stripe.Subscription);
    return "hub";
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const academyRefund = await handleAcademyRefund(
      deps.supabase as never,
      deps.stripe as never,
      charge,
    );
    if (academyRefund.handled) return "academy";
    await deps.hub.onChargeRefunded(charge);
    return "hub";
  }

  return "hub";
}
