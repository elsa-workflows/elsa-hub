import { describe, expect, it } from "vitest";
import { cloudPlanStatusLabel } from "./billingDisplay";

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
});
