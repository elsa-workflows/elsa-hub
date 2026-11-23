import { afterEach, describe, expect, it, vi } from "vitest";
import { formatBlogDate } from "./blog";

describe("formatBlogDate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ["America/Los_Angeles", "2026-09-04"],
    ["America/Los_Angeles", "2026-09-04T00:00:00.000Z"],
    ["Europe/Amsterdam", "2026-09-04"],
    ["Pacific/Kiritimati", "2026-09-04T23:30:00.000Z"],
  ])("keeps the UTC publication date in %s for %s", (timeZone, date) => {
    vi.stubEnv("TZ", timeZone);
    expect(new Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(timeZone);

    const publicationDate = new Date("2026-09-04T00:00:00.000Z").toLocaleDateString(undefined, {
      timeZone: "UTC",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    expect(formatBlogDate(date)).toBe(publicationDate);
  });
});
