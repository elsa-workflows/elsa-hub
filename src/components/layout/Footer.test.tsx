import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ACADEMY_TERMS_INDEX_PATH } from "@/lib/academyLegal";
import { ACADEMY_PATH } from "@/lib/academyPaths";

vi.mock("@/assets/elsa-logo.png", () => ({ default: "logo.png" }));

vi.mock("@/components/newsletter", () => ({
  FooterNewsletterSignup: () => <div>newsletter</div>,
}));

import { Footer } from "./Footer";

function renderFooter() {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );
}

describe("public Hub footer", () => {
  it("links Academy and Terms from the public chrome", () => {
    renderFooter();

    expect(screen.getByRole("link", { name: "Academy" })).toHaveAttribute("href", ACADEMY_PATH);
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute("href", ACADEMY_TERMS_INDEX_PATH);
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/legal/terms");
    expect(screen.queryByRole("link", { name: /academy terms/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /cloud terms/i })).not.toBeInTheDocument();
  });
});
