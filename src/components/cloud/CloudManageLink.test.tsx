import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CLOUD_MANAGE_LINK } from "@/lib/cloudClient";
import { CloudManageLink } from "./CloudManageLink";

function renderLink(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/dashboard/org/:slug/cloud" element={<CloudManageLink />} />
        <Route path="/dashboard/org/:slug/cloud/*" element={<CloudManageLink />} />
        <Route path="/dashboard/cloud" element={<CloudManageLink />} />
        <Route path="/dashboard/cloud/*" element={<CloudManageLink />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CloudManageLink", () => {
  it("points at the org Cloud console when the route has an org slug", () => {
    renderLink("/dashboard/org/acme/cloud");
    const link = screen.getByRole("link", { name: CLOUD_MANAGE_LINK });
    expect(link).toHaveAttribute("href", "/dashboard/org/acme/cloud");
    expect(link).not.toHaveAttribute("target");
    expect(link.querySelector("svg")).toBeNull();
  });

  it("points at /dashboard/cloud when there is no org slug", () => {
    renderLink("/dashboard/cloud");
    const link = screen.getByRole("link", { name: CLOUD_MANAGE_LINK });
    expect(link).toHaveAttribute("href", "/dashboard/cloud");
    expect(link).not.toHaveAttribute("target");
    expect(link.querySelector("svg")).toBeNull();
  });
});
