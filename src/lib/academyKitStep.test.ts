import { describe, expect, it } from "vitest";
import { ACADEMY_KIT_STEP_PATTERN, academyLessonMentionsKitDownload } from "./academyKitStep";

// Lines copied from the prod lesson bodies (Core, Complete, Advanced) on 30 Oct 2026.
const kitStepLines = [
  "**Download:** get `elsa-fundamentals-workshop-kit.zip` from the lab kit download on this course page (workshop host, Studio, labs). It is a download, **not** a GitHub repo invite.",
  "1. Download and unzip the kit (`elsa-fundamentals-workshop-kit.zip` from the lab kit download on this course page) and open the root **README** (solo track first).",
  "2. **Download and unzip** the lab kit, then follow [Lab kit access and run](/academy/fundamentals-core/kit-setup) to get host `:5000` + Studio `:5001` running.",
  "3. **Download and unzip** the lab kit. Follow [Lab kit access and run](/academy/advanced-patterns/kit-setup): `unzip`, `cd elsa-fundamentals-workshop`, build.",
  "**Kit:** the lab kit download (`elsa-fundamentals-workshop-kit.zip`), Labs S1 to S4  ",
];

const otherKitLines = [
  "| **Kit** | Host `http://localhost:5000` · Studio `http://localhost:5001` · `workshop` / `elsa-class` |",
  "Follow kit `labs/LabA/README.md` (in your unzipped kit folder).",
  "- Kit downloaded and unzipped; creds `workshop` / `elsa-class`",
  "unzip elsa-fundamentals-workshop-kit.zip",
  "## After download",
];

describe("academy kit step detection", () => {
  it.each(kitStepLines)("matches the prod kit sentence: %s", (line) => {
    expect(academyLessonMentionsKitDownload(line)).toBe(true);
  });

  it.each(otherKitLines)("ignores other kit lines: %s", (line) => {
    expect(academyLessonMentionsKitDownload(line)).toBe(false);
  });

  it("treats an empty body as no kit sentence", () => {
    expect(academyLessonMentionsKitDownload(null)).toBe(false);
    expect(academyLessonMentionsKitDownload("")).toBe(false);
    expect(ACADEMY_KIT_STEP_PATTERN.test("Download the kit")).toBe(true);
  });
});
