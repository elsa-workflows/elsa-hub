import { afterEach, describe, expect, it } from "vitest";
import {
  preferredCloudOrgSlug,
  readStoredOrganization,
  rememberSelectedOrganization,
} from "./selectedOrganization";

describe("preferredCloudOrgSlug", () => {
  it("returns nothing when the user has no orgs", () => {
    expect(preferredCloudOrgSlug([], "acme")).toBeUndefined();
  });

  it("uses the only org even without a stored preference", () => {
    expect(preferredCloudOrgSlug([{ slug: "acme" }])).toBe("acme");
  });

  it("uses the last-used org when it is still a membership", () => {
    expect(preferredCloudOrgSlug(
      [{ slug: "acme" }, { slug: "other-co" }],
      "other-co",
    )).toBe("other-co");
  });

  it("does not silently pick the first org when several exist and none is last-used", () => {
    expect(preferredCloudOrgSlug(
      [{ slug: "acme" }, { slug: "other-co" }],
    )).toBeUndefined();
    expect(preferredCloudOrgSlug(
      [{ slug: "acme" }, { slug: "other-co" }],
      "gone",
    )).toBeUndefined();
  });
});

describe("rememberSelectedOrganization", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("round-trips the last-used Hub org", () => {
    const org = { id: "org-1", name: "Acme", slug: "acme" };
    rememberSelectedOrganization(org);
    expect(readStoredOrganization()).toEqual(org);
  });

  it("ignores a stored value that is not a Hub org", () => {
    localStorage.setItem("selected_organization", JSON.stringify({ slug: "acme" }));
    expect(readStoredOrganization()).toBeNull();
  });
});
