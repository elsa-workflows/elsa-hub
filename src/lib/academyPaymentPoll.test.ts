import { describe, expect, it } from "vitest";
import {
  ACADEMY_PAYMENT_POLL_INTERVAL_MS,
  ACADEMY_PAYMENT_POLL_WINDOW_MS,
  academyPaymentPollInterval,
} from "./academyPaymentPoll";

describe("academyPaymentPollInterval", () => {
  it("polls every 3s for up to 60s after ?payment=success", () => {
    expect(ACADEMY_PAYMENT_POLL_INTERVAL_MS).toBe(3_000);
    expect(ACADEMY_PAYMENT_POLL_WINDOW_MS).toBe(60_000);
    expect(academyPaymentPollInterval(1_000, false, 1_000)).toBe(3_000);
    expect(academyPaymentPollInterval(1_000, false, 60_999)).toBe(3_000);
    expect(academyPaymentPollInterval(1_000, false, 61_000)).toBe(false);
  });

  it("stops once access shows up", () => {
    expect(academyPaymentPollInterval(1_000, true, 2_000)).toBe(false);
  });

  it("never polls when the page was not opened from a payment", () => {
    expect(academyPaymentPollInterval(null, false, 2_000)).toBe(false);
  });
});
