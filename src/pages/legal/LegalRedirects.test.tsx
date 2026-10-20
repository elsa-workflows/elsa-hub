import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ACADEMY_TERMS_INDEX_PATH } from "@/lib/academyLegal";
import {
  LEGACY_DPA_PATH,
  LEGACY_PRIVACY_PATH,
  LEGACY_TERMS_PATH,
  getLegacyLegalRedirectTarget,
} from "@/lib/legalRedirects";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</div>;
}

function renderLegal(initial: string) {
  const termsTarget = getLegacyLegalRedirectTarget(LEGACY_TERMS_PATH) ?? ACADEMY_TERMS_INDEX_PATH;
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path={LEGACY_TERMS_PATH} element={<Navigate to={termsTarget} replace />} />
        <Route path={ACADEMY_TERMS_INDEX_PATH} element={<LocationProbe />} />
        <Route path={LEGACY_PRIVACY_PATH} element={<LocationProbe />} />
        <Route path={LEGACY_DPA_PATH} element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("legal client-side redirects", () => {
  it("redirects /terms to /legal/terms", () => {
    renderLegal("/terms");
    expect(screen.getByTestId("location")).toHaveTextContent("/legal/terms");
  });

  it("leaves /privacy on its own path", () => {
    renderLegal("/privacy");
    expect(screen.getByTestId("location")).toHaveTextContent("/privacy");
  });

  it("leaves /dpa on its own path", () => {
    renderLegal("/dpa");
    expect(screen.getByTestId("location")).toHaveTextContent("/dpa");
  });
});
