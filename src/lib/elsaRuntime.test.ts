import { describe, expect, it } from "vitest";
import {
  ELSA_RUNTIME_PATH,
  elsaRuntimeImagePath,
  getLegacyElsaRuntimeRedirectTarget,
} from "./elsaRuntime";

describe("Elsa Runtime public paths", () => {
  it("builds canonical image-detail paths", () => {
    expect(elsaRuntimeImagePath("runtime-server")).toBe(
      "/elsa-plus/elsa-runtime/images/runtime-server",
    );
  });

  it("preserves nested paths, queries, and anchors when redirecting legacy links", () => {
    expect(
      getLegacyElsaRuntimeRedirectTarget({
        pathname: "/elsa-plus/valence-runtime/images/runtime-studio",
        search: "?source=bookmark",
        hash: "#configuration",
      }),
    ).toBe(`${ELSA_RUNTIME_PATH}/images/runtime-studio?source=bookmark#configuration`);
  });

  it("preserves legacy product-page anchors", () => {
    expect(
      getLegacyElsaRuntimeRedirectTarget({
        pathname: "/elsa-plus/valence-runtime",
        search: "",
        hash: "#tiers",
      }),
    ).toBe(`${ELSA_RUNTIME_PATH}#tiers`);
  });
});
