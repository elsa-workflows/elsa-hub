import { describe, expect, it } from "vitest";
import { CLOUD_PLAN_STATUS_NO_ACTIVE_PLAN, cloudPlanStatusLabel } from "./billingDisplay";

describe("cloudPlanStatusLabel", () => {
  it("maps live and ended-looking statuses without inventing a plan name", () => {
    expect(cloudPlanStatusLabel(null)).toBe("No subscription");
    expect(cloudPlanStatusLabel("active")).toBe("Active");
    expect(cloudPlanStatusLabel("trialing")).toBe("Active");
    expect(cloudPlanStatusLabel("past_due")).toBe("Past due");
    expect(cloudPlanStatusLabel("paused")).toBe("Paused");
    expect(cloudPlanStatusLabel("constrained")).toBe("Limited");
    expect(cloudPlanStatusLabel("active", true)).toBe("Cancels at period end");
  });

  it("maps Control Suspended (Hub 'ended') to No active plan, never Paused", () => {
    expect(CLOUD_PLAN_STATUS_NO_ACTIVE_PLAN).toBe("No active plan");
    expect(cloudPlanStatusLabel("ended")).toBe("No active plan");
    expect(cloudPlanStatusLabel("ended", true)).toBe("No active plan");
    expect(cloudPlanStatusLabel("ended")).not.toBe("ended");
    expect(cloudPlanStatusLabel("ended")).not.toBe("Paused");
    expect(cloudPlanStatusLabel("paused")).toBe("Paused");
  });
});
