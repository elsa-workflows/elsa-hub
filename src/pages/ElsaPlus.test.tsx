import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/components/layout/Layout", () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/Seo", () => ({
  Seo: () => null,
}));

vi.mock("@/components/ScrollReveal", () => ({
  ScrollReveal: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import ElsaPlus from "./ElsaPlus";

describe("ElsaPlus offerings", () => {
  it("lists Elsa Cloud as an offering that opens /elsa-plus/cloud", () => {
    render(
      <MemoryRouter>
        <ElsaPlus />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /elsa cloud/i })).toHaveAttribute("href", "/elsa-plus/cloud");
  });
});
