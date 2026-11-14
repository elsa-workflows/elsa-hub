import { describe, expect, it } from "vitest";
import {
  ELSA_LATEST_STABLE_VERSION,
  ELSA_NUGET_VERSION_URL,
  ELSA_RELEASE_LINKS,
  ELSA_TEMPLATES_ELSA_VERSION,
  ELSA_TEMPLATES_NUGET_URL,
  ELSA_TEMPLATES_VERSION,
  ELSA_UPGRADE_GUIDE_URL,
  ELSA_VERSION,
  LAST_VERIFIED_ELSA_VERSION,
} from "./elsaVersion";

describe("ELSA_VERSION visitor pins", () => {
  it("pins guides and the Resources NuGet link to 3.10.1, and keeps templates at 3.9.0", () => {
    expect(ELSA_VERSION).toBe("3.10.1");
    expect(ELSA_LATEST_STABLE_VERSION).toBe(ELSA_VERSION);
    expect(ELSA_TEMPLATES_VERSION).toBe("3.9.0");
    expect(ELSA_TEMPLATES_ELSA_VERSION).toBe("3.9.0");
    expect(ELSA_NUGET_VERSION_URL).toBe("https://www.nuget.org/packages/Elsa/3.10.1");
    expect(ELSA_TEMPLATES_NUGET_URL).toBe("https://www.nuget.org/packages/Elsa.Templates/3.9.0");
    expect(ELSA_UPGRADE_GUIDE_URL).toBe(
      "https://github.com/elsa-workflows/elsa-core/releases/tag/3.10.1",
    );
    expect(ELSA_RELEASE_LINKS.core).toBe(
      "https://github.com/elsa-workflows/elsa-core/releases/tag/3.10.1",
    );
    expect(ELSA_RELEASE_LINKS.studio).toBe(ELSA_RELEASE_LINKS.core);
    expect(ELSA_RELEASE_LINKS.extensions).toBe(ELSA_RELEASE_LINKS.core);
    expect(LAST_VERIFIED_ELSA_VERSION).toBe("3.9.0");
  });
});
