import { describe, expect, it } from "vitest";
import { cloudOrganizationLinkView, isHubOrgAdmin } from "./organizationLink";

describe("isHubOrgAdmin", () => {
  it("treats admin and owner as org admins", () => {
    expect(isHubOrgAdmin("admin")).toBe(true);
    expect(isHubOrgAdmin("owner")).toBe(true);
    expect(isHubOrgAdmin("member")).toBe(false);
    expect(isHubOrgAdmin(undefined)).toBe(false);
  });
});

describe("cloudOrganizationLinkView", () => {
  const hubOrganizationId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

  it("is idle when there is no Hub org on the route", () => {
    expect(cloudOrganizationLinkView({
      isOrgAdmin: true,
      linkLoading: false,
      linked: false,
    })).toEqual({ kind: "idle" });
  });

  it("waits while the link row is loading", () => {
    expect(cloudOrganizationLinkView({
      hubOrganizationId,
      isOrgAdmin: true,
      linkLoading: true,
      linked: false,
    })).toEqual({ kind: "pending" });
  });

  it("is linked when the org already has a validated row", () => {
    expect(cloudOrganizationLinkView({
      hubOrganizationId,
      isOrgAdmin: true,
      linkLoading: false,
      linked: true,
    })).toEqual({ kind: "linked" });
  });

  it("asks an admin to link when the org has no row", () => {
    expect(cloudOrganizationLinkView({
      hubOrganizationId,
      isOrgAdmin: true,
      linkLoading: false,
      linked: false,
    })).toEqual({ kind: "needsLink", canLink: true });
  });

  it("asks a member to wait for an admin when the org has no row", () => {
    expect(cloudOrganizationLinkView({
      hubOrganizationId,
      isOrgAdmin: false,
      linkLoading: false,
      linked: false,
    })).toEqual({ kind: "needsLink", canLink: false });
  });
});
