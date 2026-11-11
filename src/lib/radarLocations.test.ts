import { describe, expect, it } from "vitest";
import { radarSampleLocations } from "@/data/elsaUsageLocations";
import {
  RADAR_PUBLIC_COPY,
  RADAR_PUBLIC_STATUS,
  looksLikeStreetAddress,
  isApprovedRealRadarRow,
  isPublicRadarLocation,
  isSeedSampleRadarRow,
  toPublicRadarLocations,
  type RadarLocationRow,
} from "./radarLocations";

function row(overrides: Partial<RadarLocationRow> = {}): RadarLocationRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    latitude: 47.3769,
    longitude: 8.5417,
    city: "Zurich",
    country: "Switzerland",
    region: "Europe",
    anonymous: true,
    weight: 0.5,
    company_name: null,
    company_logo_url: null,
    website_url: null,
    industry: null,
    description: null,
    using_since: null,
    sort_order: 1,
    status: "approved",
    submitted_contact_email: "team@example.com",
    submitted_by: "22222222-2222-4222-8222-222222222222",
    submitted_at: "2026-10-01T00:00:00Z",
    reviewed_at: "2026-10-02T00:00:00Z",
    reviewed_by: "33333333-3333-4333-8333-333333333333",
    rejection_reason: null,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-02T00:00:00Z",
    ...overrides,
  };
}

describe("looksLikeStreetAddress", () => {
  it("rejects the Ahornweg street-address city", () => {
    expect(looksLikeStreetAddress("Ahornweg 4, Switzerland")).toBe(true);
    expect(looksLikeStreetAddress("Ahornweg 4")).toBe(true);
  });

  it("rejects other street-like city values", () => {
    expect(looksLikeStreetAddress("12 Main Street")).toBe(true);
    expect(looksLikeStreetAddress("Bahnhofstrasse 10")).toBe(true);
  });

  it("keeps ordinary city names", () => {
    expect(looksLikeStreetAddress("Zurich")).toBe(false);
    expect(looksLikeStreetAddress("São Paulo")).toBe(false);
    expect(looksLikeStreetAddress("New York")).toBe(false);
    expect(looksLikeStreetAddress("Hong Kong")).toBe(false);
    expect(looksLikeStreetAddress(null)).toBe(false);
  });
});

describe("isSeedSampleRadarRow / toPublicRadarLocations", () => {
  it("treats every hardcoded sample location as a placeholder", () => {
    for (const sample of radarSampleLocations) {
      expect(
        isSeedSampleRadarRow({
          id: sample.id,
          anonymous: sample.anonymous,
          city: sample.city ?? null,
          country: sample.country,
          company_name: sample.companyName ?? null,
          submitted_at: null,
          submitted_by: null,
          submitted_contact_email: null,
        }),
      ).toBe(true);
    }
  });

  it("does not publish sample showcases or anonymous seed cities as approved entries", () => {
    const published = toPublicRadarLocations([
      row({
        id: "valence-works",
        anonymous: false,
        city: "Amsterdam",
        country: "Netherlands",
        company_name: "Valence Works",
        submitted_at: null,
        submitted_by: null,
        submitted_contact_email: null,
      }),
      row({
        company_name: "North Claims",
        anonymous: false,
        city: "London",
        country: "United Kingdom",
        submitted_at: null,
        submitted_by: null,
        submitted_contact_email: null,
      }),
      row({
        city: "Berlin",
        country: "Germany",
        anonymous: true,
        submitted_at: null,
        submitted_by: null,
        submitted_contact_email: null,
      }),
    ]);
    expect(published).toEqual([]);
  });

  it("drops seed showcase cities that were later flipped to anonymous without submitter metadata", () => {
    const published = toPublicRadarLocations([
      row({
        city: "London",
        country: "United Kingdom",
        anonymous: true,
        company_name: null,
        submitted_at: null,
        submitted_by: null,
        submitted_contact_email: null,
      }),
      row({
        city: "New York",
        country: "United States",
        anonymous: true,
        company_name: null,
        submitted_at: null,
        submitted_by: null,
        submitted_contact_email: null,
      }),
    ]);
    expect(published).toEqual([]);
  });

  it("keeps a real submitted anonymous city even if it shares a seed city name", () => {
    const published = toPublicRadarLocations([
      row({
        city: "Berlin",
        country: "Germany",
        anonymous: true,
        submitted_at: "2026-09-01T00:00:00Z",
        submitted_contact_email: "anon@example.com",
      }),
    ]);
    expect(published).toHaveLength(1);
    expect(published[0]?.city).toBe("Berlin");
  });

  it("drops pending, rejected, and street-address rows even when approved", () => {
    expect(isApprovedRealRadarRow(row({ status: "pending" }))).toBe(false);
    expect(isApprovedRealRadarRow(row({ status: "rejected" }))).toBe(false);
    expect(isApprovedRealRadarRow(row({ status: "pending_verification" }))).toBe(false);
    expect(
      isApprovedRealRadarRow(
        row({
          city: "Ahornweg 4, Switzerland",
          country: "Switzerland",
          status: "approved",
        }),
      ),
    ).toBe(false);
  });

  it("publishes an approved real showcase", () => {
    const published = toPublicRadarLocations([
      row({
        anonymous: false,
        city: "Oslo",
        country: "Norway",
        company_name: "Real Team",
        industry: "SaaS",
      }),
    ]);
    expect(published).toEqual([
      expect.objectContaining({
        city: "Oslo",
        country: "Norway",
        companyName: "Real Team",
        anonymous: false,
      }),
    ]);
  });

  it("uses approved as the only public status", () => {
    expect(RADAR_PUBLIC_STATUS).toBe("approved");
  });

  it("page-level guard rejects hardcoded samples and Ahornweg", () => {
    expect(radarSampleLocations.every((location) => !isPublicRadarLocation(location))).toBe(true);
    expect(
      isPublicRadarLocation({
        id: "ahornweg-row",
        latitude: 47.05,
        longitude: 8.3,
        city: "Ahornweg 4, Switzerland",
        country: "Switzerland",
        region: "Europe",
        anonymous: true,
      }),
    ).toBe(false);
  });
});

describe("RADAR_PUBLIC_COPY", () => {
  it("does not claim a live sample dataset or worldwide coverage", () => {
    const copy = Object.values(RADAR_PUBLIC_COPY).join("\n").toLowerCase();
    expect(copy).not.toMatch(/sample dataset/);
    expect(copy).not.toMatch(/live, opt-in view/);
    expect(copy).not.toMatch(/all over the world/);
    expect(copy).toMatch(/approved/);
  });
});
