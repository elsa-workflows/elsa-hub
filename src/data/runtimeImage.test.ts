import { describe, expect, it } from "vitest";
import { dockerImages } from "./dockerImages";
import { RUNTIME_IMAGE_LINE, RUNTIME_IMAGE_TAG } from "./runtimeImage";

describe("RUNTIME_IMAGE_TAG", () => {
  it("is the single placeholder for the Elsa+ Runtime image line", () => {
    expect(RUNTIME_IMAGE_TAG).toBe("3.9.0");
    expect(RUNTIME_IMAGE_LINE).toBe("3.9");
  });

  it("is used in the runtime-server catalog description", () => {
    const server = dockerImages.find((image) => image.slug === "runtime-server");
    expect(server?.description).toContain(`Elsa ${RUNTIME_IMAGE_LINE}`);
    expect(server?.description).not.toContain("Elsa 3.8");
  });
});
