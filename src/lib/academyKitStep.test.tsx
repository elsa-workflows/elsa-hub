import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AcademyMarkdown } from "@/components/academy/AcademyMarkdown";
import { ACADEMY_KIT_STEP_PATTERN } from "./academyKitStep";

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

// Through the real render path (AcademyMarkdown + rehypeAcademyKitStep), not a markdown regex.
function rendersKitStep(markdown: string) {
  const { unmount } = render(
    <AcademyMarkdown markdown={markdown} kitStep={<span data-testid="kit-step-probe">kit</span>} />,
  );
  const found = screen.queryAllByTestId("kit-step-probe").length;
  unmount();
  return found;
}

describe("academy kit step detection", () => {
  it.each(kitStepLines)("places the kit step for the prod kit sentence: %s", (line) => {
    expect(rendersKitStep(line)).toBe(1);
  });

  it.each(otherKitLines)("ignores other kit lines: %s", (line) => {
    expect(rendersKitStep(line)).toBe(0);
  });

  it("treats an empty body as no kit sentence", () => {
    expect(rendersKitStep("")).toBe(0);
    expect(ACADEMY_KIT_STEP_PATTERN.test("Download the kit")).toBe(true);
  });
});
