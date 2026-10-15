import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  canonicalizeCsvRow,
  mapGumroadCsv,
  mapGumroadSale,
  normalizeEmail,
  parseCsv,
  resolveProductCode,
} from "./gumroadMigrate";

const FAKE_CSV = readFileSync(
  path.join(process.cwd(), "src/lib/academy/fixtures/gumroad-sales.fake.csv"),
  "utf8",
);

describe("normalizeEmail", () => {
  it("lower-cases and trims", () => {
    expect(normalizeEmail("  Buyer1@example.com ")).toBe("buyer1@example.com");
  });
});

describe("CSV header aliases", () => {
  it("maps Gumroad-style headers onto canonical fields", () => {
    const [row] = parseCsv(
      "Sale ID,Buyer Email,Product Name,Product ID,Company,Parent Sale ID,Is Redemption\n" +
        "sale_alias_1,buyer1@example.com,Solo Bundle,pkvdly,Example Team,sale_team,true\n",
    );

    expect(canonicalizeCsvRow(row)).toMatchObject({
      gumroadSaleId: "sale_alias_1",
      email: "buyer1@example.com",
      productName: "Solo Bundle",
      productId: "pkvdly",
      organizationName: "Example Team",
      countsAgainstSaleId: "sale_team",
      isRedemption: "true",
    });
  });
});

describe("resolveProductCode", () => {
  it("prefers an explicit product_code", () => {
    expect(
      resolveProductCode({
        gumroadSaleId: "x",
        email: "buyer1@example.com",
        productName: "Team 10",
        productId: "pkvdly",
        productCode: "solo_bundle",
        seats: "",
        organizationName: "",
        variant: "",
        countsAgainstSaleId: "",
        isRedemption: "",
      }),
    ).toBe("solo_bundle");
  });

  it("prefers a Team name over the shared Solo permalink", () => {
    expect(
      resolveProductCode({
        gumroadSaleId: "x",
        email: "buyer1@example.com",
        productName: "Team 5",
        productId: "pkvdly",
        productCode: "",
        seats: "",
        organizationName: "",
        variant: "",
        countsAgainstSaleId: "",
        isRedemption: "",
      }),
    ).toBe("team_5");
  });
});

describe("mapGumroadCsv fake fixture", () => {
  it("maps fake buyer emails, team packs and redemptions", () => {
    const result = mapGumroadCsv(FAKE_CSV);

    expect(result.rowsRead).toBe(10);
    expect(result.skippedInvalid).toBe(1);
    expect(result.skippedUnmapped).toBe(1);
    expect(result.redemptionsLinked).toBe(1);
    expect(result.redemptionsUnmapped).toBe(1);
    expect(result.mapped).toEqual([
      {
        gumroadSaleId: "sale_solo_001",
        email: "buyer1@example.com",
        productCode: "solo_bundle",
        seats: 1,
        kind: "solo",
        countsAgainstSaleId: null,
        organizationNameHint: null,
      },
      {
        gumroadSaleId: "sale_solo_permalink",
        email: "buyer1@example.com",
        productCode: "solo_bundle",
        seats: 1,
        kind: "solo",
        countsAgainstSaleId: null,
        organizationNameHint: null,
      },
      {
        gumroadSaleId: "sale_team5_001",
        email: "buyer2@example.com",
        productCode: "team_5",
        seats: 5,
        kind: "team",
        countsAgainstSaleId: null,
        organizationNameHint: "Example Team",
      },
      {
        gumroadSaleId: "sale_team10_001",
        email: "buyer3@example.com",
        productCode: "team_10",
        seats: 10,
        kind: "team",
        countsAgainstSaleId: null,
        organizationNameHint: "Acme Training",
      },
      {
        gumroadSaleId: "sale_code_001",
        email: "buyer4@example.com",
        productCode: "team_5",
        seats: 5,
        kind: "team",
        countsAgainstSaleId: null,
        organizationNameHint: null,
      },
      {
        gumroadSaleId: "sale_variant_001",
        email: "buyer1@example.com",
        productCode: "team_5",
        seats: 5,
        kind: "team",
        countsAgainstSaleId: null,
        organizationNameHint: null,
      },
      {
        gumroadSaleId: "sale_red_001",
        email: "buyer6@example.com",
        productCode: "solo_bundle",
        seats: 1,
        kind: "redemption",
        countsAgainstSaleId: "sale_team5_001",
        organizationNameHint: null,
      },
      {
        gumroadSaleId: "sale_red_unmapped",
        email: "buyer7@example.com",
        productCode: "solo_bundle",
        seats: 1,
        kind: "redemption",
        countsAgainstSaleId: null,
        organizationNameHint: null,
      },
    ]);
  });

  it("rejects a row with no sale id", () => {
    expect(
      mapGumroadSale({
        email: "buyer1@example.com",
        product_name: "Solo Bundle",
      }),
    ).toEqual({ ok: false, reason: "invalid" });
  });

  it("does not treat a zero-price row as a redemption without a flag or parent sale", () => {
    expect(
      mapGumroadSale({
        gumroad_sale_id: "sale_free",
        email: "buyer1@example.com",
        product_name: "Solo Bundle",
        price: "0",
      }),
    ).toMatchObject({
      ok: true,
      sale: { kind: "solo", countsAgainstSaleId: null },
    });
  });
});
