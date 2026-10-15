import { describe, expect, it } from "vitest";
import {
  CLOUD_PUBLIC_HOME,
  DASHBOARD_CLOUD_PATH,
  cloudConsoleBasePath,
  cloudLoginRedirect,
  dashboardCloudEnginePath,
  dashboardCloudHomePath,
  getLegacyCloudRedirectTarget,
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

describe("legacy /cloud redirects", () => {
  it("preserves nested paths, queries, and hashes for signed-in visitors", () => {
    expect(
      getLegacyCloudRedirectTarget(
        {
          pathname: "/cloud/engines/11111111-1111-4111-8111-111111111111",
          search: "?session=checkout",
          hash: "#status",
        },
        { signedIn: true, orgSlug: "acme" },
      ),
    ).toBe(
      "/dashboard/org/acme/cloud/engines/11111111-1111-4111-8111-111111111111?session=checkout#status",
    );
  });

  it("redirects the signed-in /cloud index, including query and hash", () => {
    expect(
      getLegacyCloudRedirectTarget(
        {
          pathname: "/cloud",
          search: "?payment=success",
          hash: "#engines",
        },
        { signedIn: true, orgSlug: "acme" },
      ),
    ).toBe("/dashboard/org/acme/cloud?payment=success#engines");
  });

  it("sends signed-in visitors with no Hub org to /dashboard/cloud", () => {
    expect(
      getLegacyCloudRedirectTarget(
        {
          pathname: "/cloud/engines/eng-1",
          search: "?cancel=1",
          hash: "#billing",
        },
        { signedIn: true, orgSlug: null },
      ),
    ).toBe("/dashboard/cloud/engines/eng-1?cancel=1#billing");
  });

  it("sends anonymous /cloud visitors to the public home, including query and hash", () => {
    expect(
      getLegacyCloudRedirectTarget(
        {
          pathname: "/cloud",
          search: "?payment=success",
          hash: "#engines",
        },
        { signedIn: false },
      ),
    ).toBe("/elsa-plus/cloud-services?payment=success#engines");
  });

  it("returns anonymous engine visitors to the same /cloud URL after login", () => {
    expect(
      getLegacyCloudRedirectTarget(
        {
          pathname: "/cloud/engines/eng-1",
          search: "?session=checkout",
          hash: "#status",
        },
        { signedIn: false },
      ),
    ).toBe(
      "/login?redirect=%2Fcloud%2Fengines%2Feng-1%3Fsession%3Dcheckout%23status",
    );
  });

  it("does not rewrite /cloud-services as an old Cloud console URL", () => {
    expect(
      getLegacyCloudRedirectTarget(
        {
          pathname: "/cloud-services",
          search: "?ref=nav",
          hash: "#waitlist",
        },
        { signedIn: true, orgSlug: "acme" },
      ),
    ).toBe("/cloud-services?ref=nav#waitlist");
  });
});
