import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AcademyMarkdown } from "./AcademyMarkdown";

export const ACADEMY_MARKDOWN_FIXTURE = [
  "# Stolen title from the body",
  "",
  "| Col | Value |",
  "| --- | ----- |",
  "| Host | SQLite |",
  "",
  "- [ ] Write the lab notes",
  "- [x] Read the preview",
  "",
  "<details>",
  "<summary>Lab hints</summary>",
  "",
  "Check the Studio journal.",
  "",
  "</details>",
  "",
  '<script>alert("xss")</script>',
  '<img src="x" onerror="alert(1)" />',
].join("\n");

describe("AcademyMarkdown", () => {
  it("renders GFM tables, task lists, and details, and drops script tags", () => {
    const { container } = render(<AcademyMarkdown markdown={ACADEMY_MARKDOWN_FIXTURE} />);

    expect(container.querySelector("table")).not.toBeNull();
    expect(screen.getByText("Host")).toBeInTheDocument();
    expect(screen.getByText("SQLite")).toBeInTheDocument();

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(2);
    expect(checkboxes[0]).not.toBeChecked();
    expect(checkboxes[1]).toBeChecked();

    expect(container.querySelector("details")).not.toBeNull();
    expect(container.querySelector("summary")?.textContent).toBe("Lab hints");
    expect(screen.getByText("Check the Studio journal.")).toBeInTheDocument();

    expect(container.querySelector("script")).toBeNull();
    expect(container.innerHTML).not.toMatch(/<script/i);
    expect(container.innerHTML).not.toMatch(/onerror/i);
    expect(container.innerHTML).not.toMatch(/alert\(/i);

    expect(container.querySelector("h1")).toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "Stolen title from the body" })).toBeInTheDocument();
  });
});

describe("AcademyMarkdown kit step", () => {
  it("falls back to the top of the body when the kit sentence sits in a table cell", () => {
    render(
      <AcademyMarkdown
        markdown={"Intro.\n\n| Step | What |\n|---|---|\n| 1 | Get the lab kit download |"}
        kitStep={<span data-testid="kit-step-probe">kit</span>}
      />,
    );
    const body = screen.getByTestId("academy-lesson-body");
    const probe = screen.getByTestId("kit-step-probe");
    expect(body.firstElementChild).toContainElement(probe);
    expect(screen.getAllByTestId("kit-step-probe")).toHaveLength(1);
  });

  it("renders the kit step once, after the first matching paragraph", () => {
    render(
      <AcademyMarkdown
        markdown={"Download and unzip the lab kit.\n\nThen use the lab kit download again."}
        kitStep={<span data-testid="kit-step-probe">kit</span>}
      />,
    );
    expect(screen.getAllByTestId("kit-step-probe")).toHaveLength(1);
    expect(screen.getByText("Download and unzip the lab kit.").nextElementSibling).toContainElement(
      screen.getByTestId("kit-step-probe"),
    );
  });

  it("adds nothing without a kit sentence", () => {
    render(
      <AcademyMarkdown markdown={"Follow kit `labs/LabA/README.md`."} kitStep={<span data-testid="kit-step-probe">kit</span>} />,
    );
    expect(screen.queryByTestId("kit-step-probe")).not.toBeInTheDocument();
  });
});
