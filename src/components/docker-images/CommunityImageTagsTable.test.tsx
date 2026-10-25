import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { CommunityImageTagsTable } from "./CommunityImageTagsTable";
import { ELSA_COMMUNITY_DOCKER_MINOR_TAG, ELSA_COMMUNITY_DOCKER_TAG } from "@/data/canonicalSamples";

describe("CommunityImageTagsTable", () => {
  it("documents the Docker Hub tag policy with the pinned and floating tags", () => {
    render(<CommunityImageTagsTable />);
    const table = within(screen.getByRole("table"));
    expect(table.getByText("X.Y.Z")).toBeInTheDocument();
    expect(table.getByText(ELSA_COMMUNITY_DOCKER_TAG)).toBeInTheDocument();
    expect(table.getByText(ELSA_COMMUNITY_DOCKER_MINOR_TAG)).toBeInTheDocument();
    expect(table.getByText(`${ELSA_COMMUNITY_DOCKER_TAG}-preview.1`)).toBeInTheDocument();
    expect(screen.queryByText(/runtime-ce/)).not.toBeInTheDocument();
  });
});
