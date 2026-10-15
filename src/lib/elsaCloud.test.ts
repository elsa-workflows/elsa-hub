import { describe, expect, it } from "vitest";
import {
  ELSA_CLOUD_PATH,
  elsaCloudEnginePath,
  getLegacyCloudRedirectTarget,
} from "./elsaCloud";

describe("Elsa Cloud public paths", () => {
  it("builds canonical engine-overview paths", () => {
    expect(elsaCloudEnginePath("11111111-1111-4111-8111-111111111111")).toBe(
      `${ELSA_CLOUD_PATH}/engines/11111111-1111-4111-8111-111111111111`,
    );
  });

  it("preserves nested paths, queries, and hashes when redirecting /cloud URLs", () => {
    expect(
      getLegacyCloudRedirectTarget({
        pathname: "/cloud/engines/11111111-1111-4111-8111-111111111111",
        search: "?session=checkout",
        hash: "#status",
      }),
    ).toBe(
      `${ELSA_CLOUD_PATH}/engines/11111111-1111-4111-8111-111111111111?session=checkout#status`,
    );
  });

  it("redirects the /cloud index, including query and hash", () => {
    expect(
      getLegacyCloudRedirectTarget({
        pathname: "/cloud",
        search: "?payment=success",
        hash: "#engines",
      }),
    ).toBe(`${ELSA_CLOUD_PATH}?payment=success#engines`);
  });

  it("does not rewrite /cloud-services as an old Cloud console URL", () => {
    expect(
      getLegacyCloudRedirectTarget({
        pathname: "/cloud-services",
        search: "",
        hash: "",
      }),
    ).toBe("/cloud-services");
  });
});
