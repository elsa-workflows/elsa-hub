import { describe, expect, it } from "vitest";
import { isHubOrgAdmin, shouldEnsureCloudOrganizationLink } from "./organizationLink";

describe("isHubOrgAdmin", () => {
  it("treats admin and owner as org admins", () => {
    expect(isHubOrgAdmin("admin")).toBe(true);
    expect(isHubOrgAdmin("owner")).toBe(true);
    expect(isHubOrgAdmin("member")).toBe(false);
    expect(isHubOrgAdmin(undefined)).toBe(false);
  });
});

describe("shouldEnsureCloudOrganizationLink", () => {
  const ready = {
    hubOrganizationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    isOrgAdmin: true,
    linkLoading: false,
    linked: false,
    persistPending: false,
    alreadyAttempted: false,
  };

  it("persists when an org admin is on an unlinked org Cloud route", () => {
    expect(shouldEnsureCloudOrganizationLink(ready)).toBe(true);
  });

  it("does not persist while the link row is loading", () => {
    expect(shouldEnsureCloudOrganizationLink({ ...ready, linkLoading: true })).toBe(false);
  });

  it("does not persist when the org already has a link", () => {
    expect(shouldEnsureCloudOrganizationLink({ ...ready, linked: true })).toBe(false);
  });

  it("does not persist for a non-admin member", () => {
    expect(shouldEnsureCloudOrganizationLink({ ...ready, isOrgAdmin: false })).toBe(false);
  });

  it("does not persist without a Hub org id", () => {
    expect(shouldEnsureCloudOrganizationLink({ ...ready, hubOrganizationId: undefined })).toBe(false);
  });
});
