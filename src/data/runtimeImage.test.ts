import { describe, expect, it } from "vitest";
import { ELSA_COMMUNITY_DOCKER_TAG, ELSA_DOCKER_VERSIONED_EXAMPLE } from "./canonicalSamples";
import {
  COMMUNITY_RUNTIME_IMAGE_TAGS,
  dockerImages,
  PAID_RUNTIME_IMAGE_TAGS,
} from "./dockerImages";
import {
  RUNTIME_IMAGE_LINE,
  RUNTIME_IMAGE_TAG,
  RUNTIME_IMAGES_SHARE_TAG_COPY,
  runtimeImageLineFromTag,
} from "./runtimeImage";

describe("RUNTIME_IMAGE_TAG", () => {
  it("is the published Elsa+ Runtime image tag", () => {
    expect(RUNTIME_IMAGE_TAG).toBe("3.9.0");
  });

  it("derives RUNTIME_IMAGE_LINE as major.minor of RUNTIME_IMAGE_TAG", () => {
    expect(runtimeImageLineFromTag("3.9.0")).toBe("3.9");
    expect(runtimeImageLineFromTag("4.1.2")).toBe("4.1");
    expect(RUNTIME_IMAGE_LINE).toBe(runtimeImageLineFromTag(RUNTIME_IMAGE_TAG));
  });

  it("is used in the runtime-server catalog description", () => {
    const server = dockerImages.find((image) => image.slug === "runtime-server");
    expect(server?.description).toContain(`Elsa ${RUNTIME_IMAGE_LINE}`);
    expect(server?.description).not.toContain("Elsa 3.8");
  });

  it("is not the tag in the Elsa 3 Community (Docker Hub) pull examples", () => {
    // Community snippets moved to Docker Hub elsaworkflows/*-v3 (#89/#90) and pin
    // ELSA_COMMUNITY_DOCKER_TAG; RUNTIME_IMAGE_TAG stays on the Elsa+ Runtime pages.
    expect(ELSA_DOCKER_VERSIONED_EXAMPLE).toContain(`elsa-server-v3:${ELSA_COMMUNITY_DOCKER_TAG}`);
    expect(ELSA_DOCKER_VERSIONED_EXAMPLE).toContain(`elsa-server-and-studio-v3:${ELSA_COMMUNITY_DOCKER_TAG}`);
    expect(ELSA_DOCKER_VERSIONED_EXAMPLE).not.toContain("runtime-ce-");
    expect(ELSA_DOCKER_VERSIONED_EXAMPLE).not.toContain("ELSA_SERVER_VERSION");
    expect(ELSA_DOCKER_VERSIONED_EXAMPLE).not.toContain("ELSA_STUDIO_VERSION");
  });

  it("names server, studio and combined in the shared-tag copy", () => {
    expect(RUNTIME_IMAGES_SHARE_TAG_COPY).toBe(
      `The server, studio and combined images all share one tag — they're all built from Elsa ${RUNTIME_IMAGE_TAG}.`,
    );
    expect(RUNTIME_IMAGES_SHARE_TAG_COPY).not.toMatch(/Studio and Core/i);
  });
});

describe("published runtime image tags", () => {
  it("builds community examples from RUNTIME_IMAGE_TAG", () => {
    expect(COMMUNITY_RUNTIME_IMAGE_TAGS.map((row) => row.example)).toEqual(["latest", RUNTIME_IMAGE_TAG]);
    expect(COMMUNITY_RUNTIME_IMAGE_TAGS.map((row) => row.pattern)).toEqual(["latest", "<elsa-version>"]);
  });

  it("adds paid-only sha and build.N tags without a hard-coded build number", () => {
    expect(PAID_RUNTIME_IMAGE_TAGS.map((row) => row.example)).toEqual([
      "latest",
      RUNTIME_IMAGE_TAG,
      "sha-<commit>",
      `${RUNTIME_IMAGE_TAG}-build.N`,
    ]);
    expect(PAID_RUNTIME_IMAGE_TAGS.map((row) => row.pattern)).toEqual([
      "latest",
      "<elsa-version>",
      "sha-<commit>",
      "<elsa-version>-build.N",
    ]);
    expect(PAID_RUNTIME_IMAGE_TAGS.some((row) => /build\.\d/.test(row.example))).toBe(false);
  });

  it("does not list an elsa-<version> tag", () => {
    const rows = [...COMMUNITY_RUNTIME_IMAGE_TAGS, ...PAID_RUNTIME_IMAGE_TAGS];
    expect(rows.some((row) => row.pattern.startsWith("elsa-") || row.example.startsWith("elsa-"))).toBe(false);
  });
});
