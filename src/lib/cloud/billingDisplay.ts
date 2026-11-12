/** Shared Cloud plan status labels for `/cloud` and `/cloud/billing`. */

export const CLOUD_PLAN_STATUS_NO_ACTIVE_PLAN = "No active plan";

export function cloudPlanStatusLabel(status: string | null, cancelAtPeriodEnd = false): string {
  if (!status) return "No subscription";
  if (status === "ended") return CLOUD_PLAN_STATUS_NO_ACTIVE_PLAN;
  if (cancelAtPeriodEnd) return "Cancels at period end";
  if (status === "active" || status === "trialing") return "Active";
  if (status === "past_due") return "Past due";
  if (status === "paused") return "Paused";
  if (status === "constrained") return "Limited";
  return status;
}
