import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RUNTIME_IMAGE_TAG } from "@/data/runtimeImage";
import { ImageTagsTable } from "./ImageTagsTable";

describe("ImageTagsTable", () => {
  it("lists community latest and version, and paid sha plus build.N", () => {
    render(<ImageTagsTable />);

    expect(screen.getByRole("heading", { name: "Community GHCR" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Paid ACR" })).toBeInTheDocument();
    const examples = screen.getAllByRole("cell").map((cell) => cell.textContent);
    expect(examples).toEqual(
      expect.arrayContaining(["latest", RUNTIME_IMAGE_TAG, "sha-<commit>", `${RUNTIME_IMAGE_TAG}-build.N`]),
    );
    expect(examples).not.toContain(`elsa-${RUNTIME_IMAGE_TAG}`);
    expect(examples).not.toContain("1.0.0-preview.42");
    expect(screen.queryByText(`elsa-${RUNTIME_IMAGE_TAG}`)).not.toBeInTheDocument();
  });
});
