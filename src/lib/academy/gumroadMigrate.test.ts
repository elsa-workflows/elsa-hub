import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  canonicalizeCsvRow,
  emptyCanonicalSaleRow,
  mapGumroadCsv,
  mapGumroadSale,
  normalizeEmail,
  parseCsv,
  resolveProductCode,
  resolveSeats,
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
      "Sale ID,Buyer Email,Product Name,Product ID,Company,Parent Sale ID,Is Redemption,Quantity,Refunded,Disputed\n" +
        "sale_alias_1,buyer1@example.com,Solo Bundle,pkvdly,Example Team,sale_team,true,1,false,false\n",
    );

    expect(canonicalizeCsvRow(row)).toMatchObject({
      gumroadSaleId: "sale_alias_1",
      email: "buyer1@example.com",
      productName: "Solo Bundle",
      productId: "pkvdly",
      organizationName: "Example Team",
      countsAgainstSaleId: "sale_team",
      isRedemption: "true",
      quantity: "1",
      refunded: "false",
      disputed: "false",
    });
  });
});

describe("resolveProductCode", () => {
  it("prefers an explicit product_code", () => {
    expect(
      resolveProductCode({
        ...emptyCanonicalSaleRow(),
        gumroadSaleId: "x",
        email: "buyer1@example.com",
        productName: "Team 10",
        productId: "pkvdly",
        productCode: "solo_bundle",
      }),
    ).toBe("solo_bundle");
  });

  it("prefers a Team name over the shared Solo permalink", () => {
    expect(
      resolveProductCode({
        ...emptyCanonicalSaleRow(),
        gumroadSaleId: "x",
        email: "buyer1@example.com",
        productName: "Team 5",
        productId: "pkvdly",
      }),
    ).toBe("team_5");
  });

  it("matches variant before a conflicting Solo product name", () => {
    expect(
      resolveProductCode({
        ...emptyCanonicalSaleRow(),
        gumroadSaleId: "x",
        email: "buyer1@example.com",
        productName: "Elsa+ Training Solo Bundle",
        productId: "pkvdly",
        variant: "Team 10",
      }),
    ).toBe("team_10");
  });
});

describe("resolveSeats", () => {
  it("uses pack seats when Quantity is 1", () => {
    expect(
      resolveSeats(
        {
          ...emptyCanonicalSaleRow(),
          quantity: "1",
        },
        "team_5",
      ),
    ).toBe(5);
  });

  it("multiplies pack seats by Quantity", () => {
    expect(
      resolveSeats(
        {
          ...emptyCanonicalSaleRow(),
          quantity: "2",
        },
        "team_5",
      ),
    ).toBe(10);
  });

  it("uses an explicit seats column as the only override", () => {
    expect(
      resolveSeats(
        {
          ...emptyCanonicalSaleRow(),
          seats: "7",
          quantity: "2",
        },
        "team_5",
      ),
    ).toBe(7);
  });
});

describe("mapGumroadCsv fake fixture", () => {
  it("maps fake buyer emails, team packs and redemptions", () => {
    const result = mapGumroadCsv(FAKE_CSV);

    expect(result.rowsRead).toBe(14);
    expect(result.skippedInvalid).toBe(1);
    expect(result.skippedUnmapped).toBe(1);
    expect(result.skippedRefunded).toBe(2);
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
        gumroadSaleId: "sale_mixed_variant",
        email: "buyer1@example.com",
        productCode: "team_10",
        seats: 10,
        kind: "team",
        countsAgainstSaleId: null,
        organizationNameHint: null,
      },
      {
        gumroadSaleId: "sale_qty_one",
        email: "buyer2@example.com",
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

  it("maps Quantity=1 on a Team 5 pack to 5 seats, not 1", () => {
    const result = mapGumroadSale({
      gumroad_sale_id: "sale_qty_probe",
      email: "buyer2@example.com",
      product_name: "Team 5 Pack",
      quantity: "1",
    });
    expect(result.ok).toBe(true);
    if (result.ok === false) {
      return;
    }
    expect(result.sale).toMatchObject({
      productCode: "team_5",
      seats: 5,
      kind: "team",
    });
  });

  it("maps a mixed Solo name plus Team 10 variant to team_10", () => {
    const result = mapGumroadSale({
      gumroad_sale_id: "sale_mixed_probe",
      email: "buyer1@example.com",
      product_name: "Elsa+ Training Solo Bundle",
      product_id: "pkvdly",
      variant: "Team 10",
    });
    expect(result.ok).toBe(true);
    if (result.ok === false) {
      return;
    }
    expect(result.sale).toMatchObject({
      productCode: "team_10",
      seats: 10,
      kind: "team",
    });
  });

  it("skips refunded and disputed rows", () => {
    expect(
      mapGumroadSale({
        gumroad_sale_id: "sale_ref",
        email: "buyer1@example.com",
        product_name: "Solo Bundle",
        refunded: "true",
      }),
    ).toEqual({ ok: false, reason: "refunded" });

    expect(
      mapGumroadSale({
        gumroad_sale_id: "sale_disp",
        email: "buyer1@example.com",
        product_name: "Solo Bundle",
        disputed: "fully_refunded",
      }),
    ).toEqual({ ok: false, reason: "refunded" });
  });

  it("treats a redemption parent that is not a Team sale in the same CSV as unmapped", () => {
    const result = mapGumroadCsv(
      "gumroad_sale_id,email,product_name,is_redemption,counts_against_sale_id\n" +
        "sale_solo_parent,buyer1@example.com,Solo Bundle,,\n" +
        "sale_red_bad,buyer6@example.com,Solo Bundle,true,sale_solo_parent\n",
    );
    expect(result.redemptionsLinked).toBe(0);
    expect(result.redemptionsUnmapped).toBe(1);
    expect(result.mapped[1]).toMatchObject({
      gumroadSaleId: "sale_red_bad",
      kind: "redemption",
      countsAgainstSaleId: null,
    });
  });
});
