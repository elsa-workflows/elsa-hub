/** How often, and for how long, an Academy page rechecks access after ?payment=success. */
export const ACADEMY_PAYMENT_POLL_INTERVAL_MS = 3_000;
export const ACADEMY_PAYMENT_POLL_WINDOW_MS = 60_000;

/**
 * refetchInterval for an access or ownership query on a page opened with ?payment=success.
 * startedAt is null when the page was not opened from a payment. Polling stops once the
 * query reports access (settled) or the window has passed, so the Stripe webhook has about a
 * minute to grant the entitlement before the pending line asks for a manual refresh.
 */
export function academyPaymentPollInterval(
  startedAt: number | null,
  settled: boolean,
  now: number = Date.now(),
): number | false {
  if (startedAt === null || settled) return false;
  return now - startedAt < ACADEMY_PAYMENT_POLL_WINDOW_MS ? ACADEMY_PAYMENT_POLL_INTERVAL_MS : false;
}
