import { describe, expect, it } from "vitest";
import {
  ELSA_CLOUD_PATH,
  ELSA_CLOUD_LEGAL_PAGES,
  elsaCloudEnginePath,
  elsaCloudLegalPath,
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

  it("builds Elsa Cloud legal paths under /elsa-plus/cloud/legal", () => {
    expect(elsaCloudLegalPath("terms")).toBe(`${ELSA_CLOUD_PATH}/legal/terms`);
    expect(ELSA_CLOUD_LEGAL_PAGES).toEqual({
      terms: `${ELSA_CLOUD_PATH}/legal/terms`,
      privacy: `${ELSA_CLOUD_PATH}/legal/privacy`,
      dpa: `${ELSA_CLOUD_PATH}/legal/dpa`,
      subprocessors: `${ELSA_CLOUD_PATH}/legal/subprocessors`,
    });
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
