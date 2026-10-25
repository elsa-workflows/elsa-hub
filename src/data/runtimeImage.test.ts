import { describe, expect, it } from "vitest";
import { ELSA_DOCKER_VERSIONED_EXAMPLE } from "./canonicalSamples";
import { dockerImages } from "./dockerImages";
import { RUNTIME_IMAGE_LINE, RUNTIME_IMAGE_TAG } from "./runtimeImage";

describe("RUNTIME_IMAGE_TAG", () => {
  it("is the published Elsa+ Runtime image tag", () => {
    expect(RUNTIME_IMAGE_TAG).toBe("3.9.0");
    expect(RUNTIME_IMAGE_LINE).toBe("3.9");
  });

  it("is used in the runtime-server catalog description", () => {
    const server = dockerImages.find((image) => image.slug === "runtime-server");
    expect(server?.description).toContain(`Elsa ${RUNTIME_IMAGE_LINE}`);
    expect(server?.description).not.toContain("Elsa 3.8");
  });

  it("is the single pin in versioned pull examples", () => {
    expect(ELSA_DOCKER_VERSIONED_EXAMPLE).toContain(`runtime-ce-server:${RUNTIME_IMAGE_TAG}`);
    expect(ELSA_DOCKER_VERSIONED_EXAMPLE).toContain(`runtime-ce-studio:${RUNTIME_IMAGE_TAG}`);
    expect(ELSA_DOCKER_VERSIONED_EXAMPLE).toContain(`runtime-ce-combined:${RUNTIME_IMAGE_TAG}`);
    expect(ELSA_DOCKER_VERSIONED_EXAMPLE).not.toContain("ELSA_SERVER_VERSION");
    expect(ELSA_DOCKER_VERSIONED_EXAMPLE).not.toContain("ELSA_STUDIO_VERSION");
  });
});
