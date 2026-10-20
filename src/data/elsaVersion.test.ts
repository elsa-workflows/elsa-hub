import { describe, expect, it } from "vitest";
import {
  ELSA_LATEST_STABLE_VERSION,
  ELSA_NUGET_VERSION_URL,
  ELSA_TEMPLATES_NUGET_URL,
  ELSA_TEMPLATES_VERSION,
  ELSA_UPGRADE_GUIDE_URL,
  ELSA_VERSION,
} from "./elsaVersion";

describe("ELSA_VERSION visitor pins", () => {
  it("pins guides, templates, and the Resources NuGet link to 3.9.0", () => {
    expect(ELSA_VERSION).toBe("3.9.0");
    expect(ELSA_LATEST_STABLE_VERSION).toBe(ELSA_VERSION);
    expect(ELSA_TEMPLATES_VERSION).toBe("3.9.0");
    expect(ELSA_NUGET_VERSION_URL).toBe("https://www.nuget.org/packages/Elsa/3.9.0");
    expect(ELSA_TEMPLATES_NUGET_URL).toBe("https://www.nuget.org/packages/Elsa.Templates/3.9.0");
    expect(ELSA_UPGRADE_GUIDE_URL).toContain("upgrading-to-3.9");
  });
});
