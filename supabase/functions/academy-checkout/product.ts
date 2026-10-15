export type AcademySubjectType = "user" | "org";

export type AcademyProductSpec = {
  seats: number;
  subjectType: AcademySubjectType;
};

const ACADEMY_PRODUCTS: Record<string, AcademyProductSpec> = {
  solo_bundle: { seats: 1, subjectType: "user" },
  team_5: { seats: 5, subjectType: "org" },
  team_10: { seats: 10, subjectType: "org" },
};

export function academyProductSpec(productCode: string): AcademyProductSpec | null {
  return ACADEMY_PRODUCTS[productCode] ?? null;
}

export function isTeamAcademyProduct(productCode: string): boolean {
  return academyProductSpec(productCode)?.subjectType === "org";
}
