export const ACADEMY_PRODUCT_CODES = ["solo_bundle", "team_5", "team_10"] as const;

export type AcademyProductCode = (typeof ACADEMY_PRODUCT_CODES)[number];

export type GumroadGrantKind = "solo" | "team" | "redemption";

export type MappedGumroadSale = {
  gumroadSaleId: string;
  email: string;
  productCode: AcademyProductCode;
  seats: number;
  kind: GumroadGrantKind;
  countsAgainstSaleId: string | null;
  organizationNameHint: string | null;
};

export type MapGumroadSaleFailureReason = "invalid" | "unmapped" | "refunded";

export type MapGumroadSaleFailure = {
  ok: false;
  reason: MapGumroadSaleFailureReason;
};

export type MapGumroadSaleSuccess = {
  ok: true;
  sale: MappedGumroadSale;
};

export type MapGumroadSaleResult = MapGumroadSaleSuccess | MapGumroadSaleFailure;

export type GumroadProductMapping = {
  productCode: AcademyProductCode;
  seats: number;
  ids: string[];
  namePatterns: RegExp[];
};

// Team before Solo so a shared pkvdly listing with a Team variant or name
// cannot collapse to solo_bundle. Variant is matched before product name.
export const GUMROAD_PRODUCT_MAP: GumroadProductMapping[] = [
  {
    productCode: "team_10",
    seats: 10,
    ids: [],
    namePatterns: [/\bteam\s*10\b/i, /\bteam\s*pack\s*10\b/i, /\b10\s*seats?\b/i],
  },
  {
    productCode: "team_5",
    seats: 5,
    ids: [],
    namePatterns: [/\bteam\s*5\b/i, /\bteam\s*pack\s*5\b/i, /\b5\s*seats?\b/i],
  },
  {
    productCode: "solo_bundle",
    seats: 1,
    ids: ["pkvdly"],
    namePatterns: [/\bsolo\s*bundle\b/i, /\bfundamentals\s*core\b/i],
  },
];

const HEADER_ALIASES: Record<string, keyof CanonicalSaleRow> = {
  gumroad_sale_id: "gumroadSaleId",
  sale_id: "gumroadSaleId",
  saleid: "gumroadSaleId",
  id: "gumroadSaleId",
  email: "email",
  buyer_email: "email",
  purchaser_email: "email",
  purchase_email: "email",
  product_name: "productName",
  name: "productName",
  product: "productName",
  product_id: "productId",
  permalink: "productId",
  product_permalink: "productId",
  product_code: "productCode",
  sku: "productCode",
  seats: "seats",
  quantity: "quantity",
  organization_name: "organizationName",
  organization: "organizationName",
  organisation_name: "organizationName",
  company: "organizationName",
  team_name: "organizationName",
  variant: "variant",
  tier: "variant",
  option: "variant",
  product_variant: "variant",
  counts_against_sale_id: "countsAgainstSaleId",
  team_sale_id: "countsAgainstSaleId",
  parent_sale_id: "countsAgainstSaleId",
  charged_to_sale_id: "countsAgainstSaleId",
  is_redemption: "isRedemption",
  redemption: "isRedemption",
  sale_type: "isRedemption",
  refunded: "refunded",
  is_refunded: "refunded",
  fully_refunded: "refunded",
  disputed: "disputed",
  is_disputed: "disputed",
  chargeback: "disputed",
};

export type CanonicalSaleRow = {
  gumroadSaleId: string;
  email: string;
  productName: string;
  productId: string;
  productCode: string;
  seats: string;
  quantity: string;
  organizationName: string;
  variant: string;
  countsAgainstSaleId: string;
  isRedemption: string;
  refunded: string;
  disputed: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isAcademyProductCode(value: string): value is AcademyProductCode {
  return (ACADEMY_PRODUCT_CODES as readonly string[]).includes(value);
}

export function isRedemptionFlag(value: string): boolean {
  return /^(1|true|yes|y|redemption)$/i.test(value.trim());
}

export function isRefundedOrDisputedFlag(value: string): boolean {
  return /^(1|true|yes|y|refunded|fully_refunded|disputed|chargeback)$/i.test(value.trim());
}

export function emptyCanonicalSaleRow(): CanonicalSaleRow {
  return {
    gumroadSaleId: "",
    email: "",
    productName: "",
    productId: "",
    productCode: "",
    seats: "",
    quantity: "",
    organizationName: "",
    variant: "",
    countsAgainstSaleId: "",
    isRedemption: "",
    refunded: "",
    disputed: "",
  };
}

export function parseCsv(text: string): Record<string, string>[] {
  const rows = splitCsvRows(text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n"));
  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim());
  return rows
    .slice(1)
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row) => {
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        record[header] = (row[index] ?? "").trim();
      });
      return record;
    });
}

export function canonicalizeCsvRow(row: Record<string, string>): CanonicalSaleRow {
  const canonical = emptyCanonicalSaleRow();

  for (const [rawHeader, rawValue] of Object.entries(row)) {
    const alias = HEADER_ALIASES[normalizeHeader(rawHeader)];
    if (!alias) {
      continue;
    }
    if (!canonical[alias] && rawValue) {
      canonical[alias] = rawValue.trim();
    }
  }

  return canonical;
}

export function resolveProductCode(row: CanonicalSaleRow): AcademyProductCode | null {
  const explicit = row.productCode.trim().toLowerCase();
  if (isAcademyProductCode(explicit)) {
    return explicit;
  }

  const variant = row.variant.trim();
  if (variant) {
    const fromVariant = matchProductByName(variant);
    if (fromVariant) {
      return fromVariant;
    }
  }

  const productName = row.productName.trim();
  if (productName) {
    const fromName = matchProductByName(productName);
    if (fromName) {
      return fromName;
    }
  }

  const productId = row.productId.trim().toLowerCase();
  if (productId) {
    const fromId = GUMROAD_PRODUCT_MAP.find((entry) =>
      entry.ids.some((id) => id.toLowerCase() === productId),
    );
    if (fromId) {
      return fromId.productCode;
    }
  }

  return null;
}

export function resolveSeats(row: CanonicalSaleRow, productCode: AcademyProductCode): number {
  const catalog = GUMROAD_PRODUCT_MAP.find((entry) => entry.productCode === productCode);
  const packSeats = catalog?.seats ?? 1;
  const explicitSeats = Number.parseInt(row.seats, 10);
  if (Number.isInteger(explicitSeats) && explicitSeats > 0) {
    return explicitSeats;
  }
  const quantity = Number.parseInt(row.quantity, 10);
  const units = Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
  return packSeats * units;
}

export function mapGumroadSale(row: Record<string, string>): MapGumroadSaleResult {
  const canonical = canonicalizeCsvRow(row);
  const email = normalizeEmail(canonical.email);
  const gumroadSaleId = canonical.gumroadSaleId.trim();
  const countsAgainstSaleId = canonical.countsAgainstSaleId.trim() || null;
  const redemption = isRedemptionFlag(canonical.isRedemption) || countsAgainstSaleId !== null;

  if (!gumroadSaleId || !email || !EMAIL_RE.test(email)) {
    return { ok: false, reason: "invalid" };
  }

  if (
    isRefundedOrDisputedFlag(canonical.refunded) ||
    isRefundedOrDisputedFlag(canonical.disputed)
  ) {
    return { ok: false, reason: "refunded" };
  }

  if (redemption) {
    return {
      ok: true,
      sale: {
        gumroadSaleId,
        email,
        productCode: "solo_bundle",
        seats: 1,
        kind: "redemption",
        countsAgainstSaleId,
        organizationNameHint: canonical.organizationName.trim() || null,
      },
    };
  }

  const productCode = resolveProductCode(canonical);
  if (!productCode) {
    return { ok: false, reason: "unmapped" };
  }

  const seats = resolveSeats(canonical, productCode);
  const kind: GumroadGrantKind = productCode === "solo_bundle" ? "solo" : "team";

  return {
    ok: true,
    sale: {
      gumroadSaleId,
      email,
      productCode,
      seats,
      kind,
      countsAgainstSaleId: null,
      organizationNameHint: canonical.organizationName.trim() || null,
    },
  };
}

export function mapGumroadCsv(text: string): {
  rowsRead: number;
  mapped: MappedGumroadSale[];
  skippedInvalid: number;
  skippedUnmapped: number;
  skippedRefunded: number;
  redemptionsLinked: number;
  redemptionsUnmapped: number;
} {
  const records = parseCsv(text);
  const mapped: MappedGumroadSale[] = [];
  let skippedInvalid = 0;
  let skippedUnmapped = 0;
  let skippedRefunded = 0;

  for (const record of records) {
    const result = mapGumroadSale(record);
    if (result.ok === false) {
      if (result.reason === "unmapped") {
        skippedUnmapped += 1;
      } else if (result.reason === "refunded") {
        skippedRefunded += 1;
      } else {
        skippedInvalid += 1;
      }
      continue;
    }

    mapped.push(result.sale);
  }

  const saleById = new Map(mapped.map((sale) => [sale.gumroadSaleId, sale]));

  let redemptionsLinked = 0;
  let redemptionsUnmapped = 0;

  for (const sale of mapped) {
    if (sale.kind !== "redemption") {
      continue;
    }
    if (!sale.countsAgainstSaleId) {
      redemptionsUnmapped += 1;
      continue;
    }
    const parent = saleById.get(sale.countsAgainstSaleId);
    if (parent && parent.kind !== "team") {
      sale.countsAgainstSaleId = null;
      redemptionsUnmapped += 1;
      continue;
    }
    redemptionsLinked += 1;
  }

  return {
    rowsRead: records.length,
    mapped,
    skippedInvalid,
    skippedUnmapped,
    skippedRefunded,
    redemptionsLinked,
    redemptionsUnmapped,
  };
}

function matchProductByName(value: string): AcademyProductCode | null {
  for (const entry of GUMROAD_PRODUCT_MAP) {
    if (entry.namePatterns.some((pattern) => pattern.test(value))) {
      return entry.productCode;
    }
  }
  return null;
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function splitCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(current);
      current = "";
    } else if (char === "\n") {
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  if (current !== "" || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows.filter((candidate) => candidate.some((cell) => cell.trim() !== ""));
}
