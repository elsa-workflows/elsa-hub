import { describe, expect, it } from "vitest";
import {
  APPS_IMAGES,
  COMMUNITY_IMAGES,
  ELSA_COMMUNITY_DOCKER_MINOR_TAG,
  ELSA_COMMUNITY_DOCKER_TAG,
  ELSA_DOCKER_PULL_COMMAND,
  ELSA_DOCKER_QUICKSTART_NOTE,
  ELSA_DOCKER_RUN_COMMAND,
  ELSA_DOCKER_SERVER_PULL_COMMAND,
  ELSA_DOCKER_VERSIONED_EXAMPLE,
} from "./canonicalSamples";

describe("Elsa Community Docker samples", () => {
  it("points Community images at Docker Hub v3 names with a pinned 3.9.0 tag", () => {
    expect(COMMUNITY_IMAGES.server).toBe("elsaworkflows/elsa-server-v3");
    expect(COMMUNITY_IMAGES).not.toHaveProperty("studio");
    expect(COMMUNITY_IMAGES.combined).toBe("elsaworkflows/elsa-server-and-studio-v3");
    expect(ELSA_COMMUNITY_DOCKER_TAG).toBe("3.9.0");
    expect(ELSA_COMMUNITY_DOCKER_MINOR_TAG).toBe("3.9");
    expect(ELSA_DOCKER_PULL_COMMAND).toContain(`${COMMUNITY_IMAGES.combined}:3.9.0`);
    expect(ELSA_DOCKER_RUN_COMMAND).toContain(`${COMMUNITY_IMAGES.combined}:3.9.0`);
    expect(ELSA_DOCKER_SERVER_PULL_COMMAND).toContain(`${COMMUNITY_IMAGES.server}:3.9.0`);
    expect(ELSA_DOCKER_VERSIONED_EXAMPLE).not.toContain("elsa-studio-v3");
    expect(ELSA_DOCKER_VERSIONED_EXAMPLE).toContain(":3.9.0");
    expect(ELSA_DOCKER_VERSIONED_EXAMPLE).toContain(":3.9");
    expect(ELSA_DOCKER_PULL_COMMAND).not.toContain(":latest");
  });

  it("derives the quickstart note from the Community tags", () => {
    expect(ELSA_DOCKER_QUICKSTART_NOTE).toContain(`:${ELSA_COMMUNITY_DOCKER_TAG}`);
    expect(ELSA_DOCKER_QUICKSTART_NOTE).toContain(`follows the ${ELSA_COMMUNITY_DOCKER_MINOR_TAG} line`);
  });

  it("leaves Apps aliases distinct from Community image names", () => {
    expect(APPS_IMAGES.server).toBe("elsaworkflows/elsa-server");
    expect(APPS_IMAGES.studio).toBe("elsaworkflows/elsa-studio");
    expect(APPS_IMAGES.server).not.toBe(COMMUNITY_IMAGES.server);
  });
});
