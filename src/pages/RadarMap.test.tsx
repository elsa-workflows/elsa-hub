import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import type { ElsaUsageLocation } from "@/data/elsaUsageLocations";
import { radarSampleLocations } from "@/data/elsaUsageLocations";
import { RADAR_PUBLIC_COPY } from "@/lib/radarLocations";

const locations: ElsaUsageLocation[] = [];

vi.mock("@/hooks/useRadarLocations", () => ({
  useRadarLocations: () => ({ data: locations, isLoading: false }),
}));

vi.mock("@/components/layout/Layout", () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/radar/GlobeRadar", () => ({
  GlobeRadar: ({ locations: points }: { locations: ElsaUsageLocation[] }) => (
    <div>
      <div>{RADAR_PUBLIC_COPY.globeStatus}</div>
      <div>{RADAR_PUBLIC_COPY.globeDataset}</div>
      <ul>
        {points.map((point) => (
          <li key={point.id}>
            {point.anonymous
              ? `Anonymous deployment in ${point.city ? `${point.city}, ` : ""}${point.country}`
              : `${point.companyName} in ${point.city}, ${point.country}`}
          </li>
        ))}
      </ul>
    </div>
  ),
}));

vi.mock("@/components/radar/AddTeamDialog", () => ({
  AddTeamDialog: () => null,
}));

import RadarMap from "./RadarMap";

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <RadarMap />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
}

describe("RadarMap", () => {
  it("uses approved-entry copy and an empty state when there are no public rows", () => {
    locations.splice(0, locations.length);
    renderPage();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(RADAR_PUBLIC_COPY.headline);
    expect(screen.getByText(RADAR_PUBLIC_COPY.lede)).toBeInTheDocument();
    expect(screen.getByText(RADAR_PUBLIC_COPY.empty)).toBeInTheDocument();
    expect(screen.getByText(RADAR_PUBLIC_COPY.globeDataset)).toBeInTheDocument();

    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/sample dataset/i);
    expect(body).not.toMatch(/live, opt-in view/i);
    expect(body).not.toMatch(/all over the world/i);
    expect(body).not.toMatch(/Ahornweg/i);
    expect(screen.queryByText(/Anonymous deployment in Berlin/i)).not.toBeInTheDocument();
  });

  it("does not render sample placeholders or the Ahornweg street address", () => {
    locations.splice(
      0,
      locations.length,
      ...radarSampleLocations,
      {
        id: "ahornweg-row",
        latitude: 47.05,
        longitude: 8.3,
        city: "Ahornweg 4, Switzerland",
        country: "Switzerland",
        region: "Europe",
        anonymous: true,
      },
      {
        id: "real-oslo",
        latitude: 59.9139,
        longitude: 10.7522,
        city: "Oslo",
        country: "Norway",
        region: "Europe",
        anonymous: false,
        companyName: "Real Team",
        industry: "SaaS",
      },
    );

    renderPage();

    expect(screen.getByText(/Real Team in Oslo/i)).toBeInTheDocument();
    expect(screen.queryByText(/North Claims/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Valence Works/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ahornweg/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Anonymous deployment in Berlin/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sample dataset/i)).not.toBeInTheDocument();
    expect(screen.queryByText(RADAR_PUBLIC_COPY.empty)).not.toBeInTheDocument();
  });
});
