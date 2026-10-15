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

export type MapGumroadSaleFailure = {
  ok: false;
  reason: "invalid" | "unmapped";
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

// Map Gumroad product names and permalinks to Hub product codes.
// The live Training CTA uses permalink pkvdly for Solo Bundle (and currently
// also the Team pack button). Prefer name / variant / product_code over id.
export const GUMROAD_PRODUCT_MAP: GumroadProductMapping[] = [
  {
    productCode: "solo_bundle",
    seats: 1,
    ids: ["pkvdly"],
    namePatterns: [/\bsolo\s*bundle\b/i, /\bfundamentals\s*core\b/i],
  },
  {
    productCode: "team_5",
    seats: 5,
    ids: [],
    namePatterns: [/\bteam\s*5\b/i, /\bteam\s*pack\s*5\b/i, /\b5\s*seats?\b/i],
  },
  {
    productCode: "team_10",
    seats: 10,
    ids: [],
    namePatterns: [/\bteam\s*10\b/i, /\bteam\s*pack\s*10\b/i, /\b10\s*seats?\b/i],
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
  quantity: "seats",
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
};

type CanonicalSaleRow = {
  gumroadSaleId: string;
  email: string;
  productName: string;
  productId: string;
  productCode: string;
  seats: string;
  organizationName: string;
  variant: string;
  countsAgainstSaleId: string;
  isRedemption: string;
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
  const canonical: CanonicalSaleRow = {
    gumroadSaleId: "",
    email: "",
    productName: "",
    productId: "",
    productCode: "",
    seats: "",
    organizationName: "",
    variant: "",
    countsAgainstSaleId: "",
    isRedemption: "",
  };

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

  const nameHaystack = `${row.productName} ${row.variant}`.trim();
  if (nameHaystack) {
    const fromName = matchProductByName(nameHaystack);
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

export function mapGumroadSale(row: Record<string, string>): MapGumroadSaleResult {
  const canonical = canonicalizeCsvRow(row);
  const email = normalizeEmail(canonical.email);
  const gumroadSaleId = canonical.gumroadSaleId.trim();
  const countsAgainstSaleId = canonical.countsAgainstSaleId.trim() || null;
  const redemption = isRedemptionFlag(canonical.isRedemption) || countsAgainstSaleId !== null;

  if (!gumroadSaleId || !email || !EMAIL_RE.test(email)) {
    return { ok: false, reason: "invalid" };
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

  const catalog = GUMROAD_PRODUCT_MAP.find((entry) => entry.productCode === productCode);
  const parsedSeats = Number.parseInt(canonical.seats, 10);
  const seats = Number.isInteger(parsedSeats) && parsedSeats > 0 ? parsedSeats : catalog?.seats ?? 1;
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
  redemptionsLinked: number;
  redemptionsUnmapped: number;
} {
  const records = parseCsv(text);
  const mapped: MappedGumroadSale[] = [];
  let skippedInvalid = 0;
  let skippedUnmapped = 0;
  let redemptionsLinked = 0;
  let redemptionsUnmapped = 0;

  for (const record of records) {
    const result = mapGumroadSale(record);
    if (!result.ok) {
      if (result.reason === "unmapped") {
        skippedUnmapped += 1;
      } else {
        skippedInvalid += 1;
      }
      continue;
    }

    mapped.push(result.sale);
    if (result.sale.kind === "redemption") {
      if (result.sale.countsAgainstSaleId) {
        redemptionsLinked += 1;
      } else {
        redemptionsUnmapped += 1;
      }
    }
  }

  return {
    rowsRead: records.length,
    mapped,
    skippedInvalid,
    skippedUnmapped,
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
