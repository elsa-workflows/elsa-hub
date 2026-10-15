import { describe, expect, it } from "vitest";
import {
  CLOUD_PUBLIC_HOME,
  DASHBOARD_CLOUD_PATH,
  cloudConsoleBasePath,
  cloudLoginRedirect,
  dashboardCloudEnginePath,
  dashboardCloudHomePath,
} from "./cloudPaths";

describe("cloud dashboard paths", () => {
  it("uses the org-scoped Cloud route when a Hub org slug is known", () => {
    expect(dashboardCloudHomePath("acme")).toBe("/dashboard/org/acme/cloud");
    expect(dashboardCloudEnginePath("eng-1", "acme")).toBe(
      "/dashboard/org/acme/cloud/engines/eng-1",
    );
  });

  it("keeps a dashboard Cloud route that works without an org", () => {
    expect(dashboardCloudHomePath()).toBe(DASHBOARD_CLOUD_PATH);
    expect(dashboardCloudHomePath(null)).toBe(DASHBOARD_CLOUD_PATH);
    expect(dashboardCloudEnginePath("eng-1")).toBe(`${DASHBOARD_CLOUD_PATH}/engines/eng-1`);
  });

  it("reads the console base path from the current dashboard route", () => {
    expect(cloudConsoleBasePath("/dashboard/org/acme/cloud/engines/1")).toBe(
      "/dashboard/org/acme/cloud",
    );
    expect(cloudConsoleBasePath("/dashboard/cloud/engines/1")).toBe(DASHBOARD_CLOUD_PATH);
    expect(cloudConsoleBasePath("/cloud")).toBe("/cloud");
    expect(CLOUD_PUBLIC_HOME).toBe("/elsa-plus/cloud-services");
  });

  it("returns anonymous engine visitors to the same /cloud URL after login", () => {
    expect(cloudLoginRedirect("/cloud/engines/eng-1")).toBe(
      "/login?redirect=%2Fcloud%2Fengines%2Feng-1",
    );
  });
});
