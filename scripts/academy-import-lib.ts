import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import path from "node:path";

export const ACADEMY_KITS_BUCKET = "academy-kits";
export const STALE_COMPLETE_ZIP_PREFIX =
  "7380ab47d2343bf329a109a723ed31c95130e91f81b3ebe079ac7e1d552316c1";
export const REBUILT_COMPLETE_ZIP_SHA256 =
  "648b8486635a1be6d1cd55e7255986ab9387f0854d195cc91ce0fb588f70feff";
export const SUPERSEDED_COMPLETE_ZIP_PREFIX =
  "464b8b0a6765e69ed46544e503e5e9c09b5e96a0f967c3c86f7338d3fa8c9271";
export const KIT_SHA256 =
  "3184ea17f87a76c9de4370cddd797635c21509cf28af09994f1bf8b44e81f9c2";
export const SHA256_RE = /^[0-9a-f]{64}$/;
export const PRODUCT_CODE_RE = /^[a-z0-9_]+$/;
export const STRIPE_PRICE_ID_RE = /^price_[A-Za-z0-9_]+$/;
export const SLUG_MAX = 120;
export const TITLE_MAX = 200;

export class PathEscapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PathEscapeError";
  }
}

const EXCLUDED_SOURCE_PATTERNS: RegExp[] = [
  /(?:^|\/)labs\/.+-README\.md$/i,
  /(?:^|\/)DH-INDEX\.md$/i,
  /(?:^|\/)modules\/INDEX\.md$/i,
  /(?:^|\/)meta\//,
  /(?:^|\/)facilitator\//,
];

export const COPY_RULES: { name: string; pattern: RegExp }[] = [
  { name: "dash", pattern: /[\u2013\u2014]/ },
  { name: "elsa-3.8", pattern: /\b3\.8(\.\d+)?\b/ },
  { name: "price", pattern: /€|\bEUR\b|\$\s?\d|\b(price|pricing)\b/ },
  { name: "vat", pattern: /\bVAT\b/ },
  { name: "sku", pattern: /\bSKU\b(?!-?\d)/ },
  { name: "gumroad", pattern: /gumroad/i },
  { name: "ceo", pattern: /\bCEO\b/ },
  {
    name: "internal",
    pattern:
      /\bSipke\b|\bTBD\b|\bkit PR\b|\bPR #\d+|(?<![\w/(])#\d{2,}\b|\bStatus:\*\*|\binternal\b|\bfacilitator\b/i,
  },
  {
    name: "private-link",
    pattern: /github\.com\/valence-works|elsa-plus-training/,
  },
  {
    name: "retired-repo",
    pattern: /\belsa-studio\b|\belsa-extensions\b|\belsa-apps\b/,
  },
  {
    name: "closer",
    pattern:
      /^\s*(happy (coding|building|learning)|hope (this|that) helps|let me know if|feel free to|good luck|you've got this)/i,
  },
  {
    name: "zip-nav",
    pattern:
      /KIT-ACCESS\.md|START-HERE\.md|modules\/INDEX|`modules\/|this (course )?zip|course pack|this pack\b|in this folder|\]\((?!\/academy\/|https?:\/\/)[^)]*\)/,
  },
];

export type Rewrite = {
  course?: string;
  source?: string;
  file?: string;
  from: string;
  to: string;
};

export type ManifestAsset = {
  label: string;
  storage_path?: string;
  lesson_slug?: string | null;
  source?: string;
  file?: string;
  file_name?: string;
  skip?: boolean;
  sha256?: string;
  size_bytes?: number;
  bytes?: number;
  extras?: {
    sha256?: string;
    bytes?: number;
    size_bytes?: number;
    description?: string;
  };
};

export type ManifestLesson = {
  slug: string;
  title?: string | null;
  source_md?: string;
  body_md_file?: string;
  sort_order?: number;
  is_preview?: boolean;
  estimated_minutes?: number | null;
  preview_reason?: string;
};

export type ManifestCourse = {
  slug: string;
  title: string;
  summary?: string | null;
  sort_order?: number;
  is_published?: boolean;
  price_cents?: number | null;
  currency?: string | null;
  product_code?: string | null;
  stripe_price_id?: string | null;
  lessons: ManifestLesson[];
  assets?: ManifestAsset[];
  extra_assets?: ManifestAsset[];
  notes?: string[];
};

export type KitRelease = {
  tag: string;
  commit?: string;
  asset: string;
  sha256: string;
  bytes: number;
  storage_path?: string;
  owner_course?: string;
};

export type AcademyManifest = {
  courses: ManifestCourse[];
  kit_release?: KitRelease;
  module_rewrites?: Record<string, Rewrite[]>;
  web_source_rewrites?: Rewrite[];
  excluded_asset_sha256_prefixes?: string[];
  elsa_version?: string;
  [key: string]: unknown;
};

export type ProductDef = {
  product_code: string;
  title: string;
  slug?: string;
  summary?: string;
  price_cents: number;
  currency: string;
  seats: number;
  covers: string[];
  stripe_price_id?: string;
  stripe_price_id_env?: string;
  sku_row?: boolean;
  is_published?: boolean;
};

export type ProductMapping = {
  catalogSku: string;
  currency: string;
  launchPriceCents: number;
  postLaunchPriceCents: number;
  publishCatalogCourses: boolean;
  courseOwnCodes?: Record<string, string | null>;
  r2: {
    courseProductCodesColumn: string;
    writeArrayColumn: boolean;
  };
  products: ProductDef[];
};

export type SourceLayout = {
  kind: "git" | "box";
  coursesDir: string | null;
  sourceRoot: string;
};

export type PlannedCourse = {
  slug: string;
  title: string;
  summary: string | null;
  sort_order: number;
  is_published: boolean;
  stripe_price_id: string | null;
  price_cents: number;
  currency: string;
  product_code: string;
  product_codes: string[];
  sku_row: boolean;
};

export type PlannedLesson = {
  course_slug: string;
  slug: string;
  title: string;
  sort_order: number;
  body_md: string;
  is_preview: boolean;
  duration_minutes: number | null;
  source_path: string;
};

export type PlannedAsset = {
  course_slug: string;
  lesson_slug: string | null;
  label: string;
  storage_path: string;
  sha256: string;
  size_bytes: number;
  local_path: string | null;
  skip: boolean;
  skip_reason?: string;
  shared_kit: boolean;
};

export type OpKind = "insert" | "update" | "unchanged" | "skip" | "refuse";

export type PlannedOp<T> = {
  kind: OpKind;
  key: string;
  reason?: string;
  desired: T;
  existing?: Record<string, unknown> | null;
};

export type CopyHit = {
  where: string;
  rule: string;
  line: number;
  text: string;
};

export type CatalogSnapshot = {
  courses: Record<string, Record<string, unknown>>;
  lessons: Record<string, Record<string, unknown>>;
  assets: Record<string, Record<string, unknown>>;
};

export type ImportPlan = {
  layout: SourceLayout;
  sourceCommit: string | null;
  publish: boolean;
  courses: PlannedOp<PlannedCourse>[];
  lessons: PlannedOp<PlannedLesson>[];
  assets: PlannedOp<PlannedAsset>[];
  copyHits: CopyHit[];
  errors: string[];
  warnings: string[];
};

export function countExact(haystack: string, needle: string): number {
  if (!needle) return 0;
  let n = 0;
  let i = 0;
  while (i < haystack.length) {
    const j = haystack.indexOf(needle, i);
    if (j === -1) break;
    n += 1;
    i = j + needle.length;
  }
  return n;
}

export function stripLeadingH1(md: string): { title: string | null; body: string } {
  if (!md.startsWith("# ")) return { title: null, body: md };
  const nl = md.indexOf("\n");
  if (nl === -1) {
    return { title: md.slice(2).trim(), body: "" };
  }
  return {
    title: md.slice(2, nl).trim(),
    body: md.slice(nl + 1).replace(/^\n/, ""),
  };
}

export function applyExactRewrites(
  body: string,
  rewrites: Rewrite[],
  context: string,
): string {
  let next = body;
  for (const rewrite of rewrites) {
    const hits = countExact(next, rewrite.from);
    if (hits !== 1) {
      throw new Error(
        `${context}: rewrite target not found or not unique (${hits} hits): ${rewrite.from}`,
      );
    }
    next = next.replace(rewrite.from, rewrite.to);
  }
  return next;
}

export function digestBytes(bytes: Uint8Array | Buffer): {
  sha256: string;
  sizeBytes: number;
} {
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  return {
    sha256: createHash("sha256").update(buf).digest("hex"),
    sizeBytes: buf.byteLength,
  };
}

export function assetSha256(asset: ManifestAsset): string | null {
  return asset.sha256 ?? asset.extras?.sha256 ?? null;
}

export function assetSizeBytes(asset: ManifestAsset): number | null {
  const value = asset.size_bytes ?? asset.bytes ?? asset.extras?.size_bytes ?? asset.extras?.bytes;
  return typeof value === "number" ? value : null;
}

export function assetFileRef(asset: ManifestAsset): string | null {
  return asset.file ?? asset.source ?? asset.file_name ?? null;
}

export function courseAssets(course: ManifestCourse): ManifestAsset[] {
  return [...(course.assets ?? []), ...(course.extra_assets ?? [])];
}

export function isExcludedSourcePath(relPath: string): boolean {
  const normalized = relPath.replaceAll("\\", "/");
  return EXCLUDED_SOURCE_PATTERNS.some((re) => re.test(normalized));
}

export function isExcludedSha(
  sha: string | null | undefined,
  prefixes: string[],
): boolean {
  if (!sha) return false;
  return prefixes.some((prefix) => sha.startsWith(prefix.toLowerCase()));
}

export function verifyChecksum(
  bytes: Uint8Array | Buffer,
  expectedSha: string,
  expectedSize: number,
  label: string,
): void {
  const got = digestBytes(bytes);
  if (got.sha256 !== expectedSha || got.sizeBytes !== expectedSize) {
    throw new Error(
      `Checksum mismatch for ${label}: expected sha256=${expectedSha} size_bytes=${expectedSize}, got sha256=${got.sha256} size_bytes=${got.sizeBytes}. Upload refused.`,
    );
  }
}

export function kitStoragePath(kit: KitRelease): string {
  if (kit.storage_path) return kit.storage_path.replace(/^academy-kits\//, "");
  const folder = kit.tag.replace(/^workshop\//, "");
  return `kits/${folder}/${kit.asset}`;
}

export function remapStoragePath(
  asset: ManifestAsset,
  courseSlug: string,
  kit: KitRelease | undefined,
): string {
  const sha = assetSha256(asset);
  const fileRef = assetFileRef(asset) ?? asset.storage_path ?? "asset.bin";
  const fileName = path.basename(fileRef);
  const declared = (asset.storage_path ?? "").replace(/^academy-kits\//, "");

  if (kit && sha === kit.sha256) {
    return kitStoragePath(kit);
  }
  if (sha === REBUILT_COMPLETE_ZIP_SHA256) {
    return `courses/elsa-3.9.0-20261016/${fileName}`;
  }
  const source = asset.source ?? asset.file ?? "";
  const pack = source.match(/packaging\/(elsa-[^/]+)\//);
  if (pack) {
    return `courses/${pack[1]}/${fileName}`;
  }
  if (declared) return declared;
  return `${courseSlug}/${fileName}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function assertStripePriceId(value: string, label = "--stripe-price-id"): string {
  const trimmed = value.trim();
  if (!STRIPE_PRICE_ID_RE.test(trimmed)) {
    throw new Error(`${label} must match ${STRIPE_PRICE_ID_RE} (got ${JSON.stringify(value)})`);
  }
  return trimmed;
}

export function isUnsafePathRef(ref: string): boolean {
  if (!ref || !ref.trim()) return true;
  const trimmed = ref.trim();
  if (path.isAbsolute(trimmed) || path.win32.isAbsolute(trimmed)) return true;
  if (trimmed.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(trimmed)) return true;
  const normalized = trimmed.replaceAll("\\", "/");
  return normalized.split("/").includes("..");
}

export function isPathInside(child: string, parent: string): boolean {
  const rel = path.relative(parent, child);
  if (!rel) return true;
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}

function realRoot(root: string): string {
  const resolved = path.resolve(root);
  try {
    return existsSync(resolved) ? realpathSync(resolved) : resolved;
  } catch {
    return resolved;
  }
}

export function assertSafeRelativeRef(ref: string, context: string): void {
  if (isUnsafePathRef(ref)) {
    throw new PathEscapeError(
      `${context}: refused path ${JSON.stringify(ref)} (absolute paths and .. are not allowed; stay inside --source-root or --assets-dir)`,
    );
  }
}

function existingContainedFile(candidate: string, allowedRoots: string[], context: string): string | null {
  if (!existsSync(candidate)) return null;
  let real: string;
  try {
    real = realpathSync(candidate);
  } catch {
    throw new PathEscapeError(`${context}: cannot resolve ${candidate}`);
  }
  if (!statSync(real).isFile()) return null;
  const roots = allowedRoots.map(realRoot);
  if (!roots.some((root) => isPathInside(real, root))) {
    throw new PathEscapeError(
      `${context}: resolved path ${real} is outside --source-root/--assets-dir`,
    );
  }
  return real;
}

function pushErr(errors: string[], ok: boolean, message: string): void {
  if (!ok) errors.push(message);
}

export function validateManifest(data: unknown): {
  ok: boolean;
  errors: string[];
  manifest?: AcademyManifest;
} {
  const errors: string[] = [];
  if (!isRecord(data)) return { ok: false, errors: ["manifest must be an object"] };
  if (!Array.isArray(data.courses) || data.courses.length === 0) {
    return { ok: false, errors: ["manifest.courses must be a non-empty array"] };
  }

  if (data.kit_release) {
    if (!isRecord(data.kit_release)) {
      errors.push("kit_release must be an object");
    } else {
      const kit = data.kit_release;
      pushErr(errors, typeof kit.tag === "string" && kit.tag.length > 0, "kit_release.tag is required");
      pushErr(errors, typeof kit.asset === "string" && kit.asset.length > 0, "kit_release.asset is required");
      pushErr(errors, typeof kit.sha256 === "string" && SHA256_RE.test(kit.sha256), "kit_release.sha256 must be 64 lowercase hex chars");
      pushErr(errors, typeof kit.bytes === "number" && kit.bytes >= 0, "kit_release.bytes must be a non-negative integer");
    }
  }

  if (data.excluded_asset_sha256_prefixes !== undefined) {
    if (!Array.isArray(data.excluded_asset_sha256_prefixes)) {
      errors.push("excluded_asset_sha256_prefixes must be an array of strings");
    }
  }

  const courseSlugs = new Set<string>();
  for (const [ci, rawCourse] of data.courses.entries()) {
    if (!isRecord(rawCourse)) {
      errors.push(`courses[${ci}] must be an object`);
      continue;
    }
    const slug = asString(rawCourse.slug);
    const title = asString(rawCourse.title);
    pushErr(errors, !!slug && slug.length <= SLUG_MAX, `courses[${ci}].slug is required (1-${SLUG_MAX} chars)`);
    pushErr(errors, !!title && title.length <= TITLE_MAX, `courses[${ci}].title is required (1-${TITLE_MAX} chars)`);
    if (slug) {
      if (courseSlugs.has(slug)) errors.push(`duplicate course slug: ${slug}`);
      courseSlugs.add(slug);
    }
    if (rawCourse.product_code != null && rawCourse.product_code !== "") {
      pushErr(
        errors,
        typeof rawCourse.product_code === "string" && PRODUCT_CODE_RE.test(rawCourse.product_code),
        `${slug ?? ci}: product_code must match ${PRODUCT_CODE_RE}`,
      );
    }
    if (!Array.isArray(rawCourse.lessons) || rawCourse.lessons.length === 0) {
      errors.push(`${slug ?? ci}: lessons must be a non-empty array`);
      continue;
    }
    const lessonSlugs = new Set<string>();
    let preview = 0;
    const orders: number[] = [];
    for (const [li, rawLesson] of rawCourse.lessons.entries()) {
      if (!isRecord(rawLesson)) {
        errors.push(`${slug}.lessons[${li}] must be an object`);
        continue;
      }
      const lslug = asString(rawLesson.slug);
      pushErr(errors, !!lslug && lslug.length <= SLUG_MAX, `${slug}.lessons[${li}].slug is required`);
      if (lslug) {
        if (lessonSlugs.has(lslug)) errors.push(`${slug}: duplicate lesson slug ${lslug}`);
        lessonSlugs.add(lslug);
      }
      if (rawLesson.is_preview === true) preview += 1;
      if (typeof rawLesson.sort_order === "number") orders.push(rawLesson.sort_order);
      if (rawLesson.estimated_minutes != null) {
        pushErr(
          errors,
          typeof rawLesson.estimated_minutes === "number" && rawLesson.estimated_minutes > 0,
          `${slug}/${lslug}: estimated_minutes must be > 0 when set`,
        );
      }
    }
    if (preview === 0) errors.push(`${slug}: at least one lesson must have is_preview true (AC2)`);
    if (orders.length === rawCourse.lessons.length) {
      const expected = rawCourse.lessons.map((_, i) => i);
      if (orders.join(",") !== expected.join(",")) {
        errors.push(`${slug}: sort_order must be 0..n-1 in lesson order`);
      }
    }
    const allAssets = [
      ...(Array.isArray(rawCourse.assets) ? rawCourse.assets : []),
      ...(Array.isArray(rawCourse.extra_assets) ? rawCourse.extra_assets : []),
    ];
    if (rawCourse.assets !== undefined && !Array.isArray(rawCourse.assets)) {
      errors.push(`${slug}: assets must be an array`);
    }
    if (rawCourse.extra_assets !== undefined && !Array.isArray(rawCourse.extra_assets)) {
      errors.push(`${slug}: extra_assets must be an array`);
    }
    for (const [ai, rawAsset] of allAssets.entries()) {
      if (!isRecord(rawAsset)) {
        errors.push(`${slug}.assets[${ai}] must be an object`);
        continue;
      }
      pushErr(errors, typeof rawAsset.label === "string" && rawAsset.label.length > 0, `${slug}.assets[${ai}].label is required`);
      const sha = asString(rawAsset.sha256) ?? (isRecord(rawAsset.extras) ? asString(rawAsset.extras.sha256) : null);
      if (sha) pushErr(errors, SHA256_RE.test(sha), `${slug}.assets[${ai}].sha256 must be 64 lowercase hex chars`);
      const size = rawAsset.size_bytes ?? rawAsset.bytes ?? (isRecord(rawAsset.extras) ? rawAsset.extras.bytes : null);
      if (size != null) {
        pushErr(errors, typeof size === "number" && size >= 0, `${slug}.assets[${ai}].size_bytes must be >= 0`);
      }
      const lessonSlug = rawAsset.lesson_slug;
      if (lessonSlug && typeof lessonSlug === "string" && !lessonSlugs.has(lessonSlug)) {
        errors.push(`${slug}: asset ${String(rawAsset.label)} points at unknown lesson ${lessonSlug}`);
      }
    }
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, errors: [], manifest: data as AcademyManifest };
}

export function validateProductMapping(data: unknown): {
  ok: boolean;
  errors: string[];
  mapping?: ProductMapping;
} {
  const errors: string[] = [];
  if (!isRecord(data)) return { ok: false, errors: ["product mapping must be an object"] };
  pushErr(errors, typeof data.catalogSku === "string" && PRODUCT_CODE_RE.test(data.catalogSku), "catalogSku is required");
  pushErr(errors, typeof data.launchPriceCents === "number", "launchPriceCents is required");
  pushErr(errors, typeof data.postLaunchPriceCents === "number", "postLaunchPriceCents is required");
  if (!isRecord(data.r2)) errors.push("r2 must be an object with courseProductCodesColumn and writeArrayColumn");
  else {
    pushErr(errors, typeof data.r2.courseProductCodesColumn === "string", "r2.courseProductCodesColumn is required");
    pushErr(errors, typeof data.r2.writeArrayColumn === "boolean", "r2.writeArrayColumn must be boolean");
  }
  if (!Array.isArray(data.products) || data.products.length === 0) {
    errors.push("products must be a non-empty array");
  } else {
    for (const product of data.products) {
      if (!isRecord(product)) {
        errors.push("each product must be an object");
        continue;
      }
      pushErr(errors, typeof product.product_code === "string" && PRODUCT_CODE_RE.test(product.product_code), `bad product_code`);
      pushErr(errors, Array.isArray(product.covers) && product.covers.length > 0, `${String(product.product_code)}: covers must list course slugs`);
      pushErr(errors, typeof product.price_cents === "number" && product.price_cents >= 0, `${String(product.product_code)}: price_cents`);
    }
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, errors: [], mapping: data as ProductMapping };
}

export function productCodesForCourse(mapping: ProductMapping, courseSlug: string): string[] {
  const codes: string[] = [mapping.catalogSku];
  const own = mapping.courseOwnCodes?.[courseSlug];
  if (own && own.trim()) codes.push(own.trim());
  for (const product of mapping.products) {
    if (product.covers.includes(courseSlug)) codes.push(product.product_code);
  }
  const unique: string[] = [];
  for (const code of codes) {
    if (!unique.includes(code)) unique.push(code);
  }
  if (!unique.includes(mapping.catalogSku)) unique.unshift(mapping.catalogSku);
  return unique;
}

export function resolveStripePriceId(
  product: ProductDef,
  env: NodeJS.Dict<string> = process.env,
  options: { required?: boolean; errors?: string[] } = {},
): string {
  const envName = product.stripe_price_id_env;
  const fromEnv = envName ? env[envName] : undefined;
  const trimmed = typeof fromEnv === "string" ? fromEnv.trim() : "";
  if (options.required) {
    if (!envName) {
      options.errors?.push(`${product.product_code}: stripe_price_id_env is required under --apply`);
      return "";
    }
    if (!trimmed) {
      options.errors?.push(`${envName} is required under --apply (missing or empty)`);
      return "";
    }
    if (!STRIPE_PRICE_ID_RE.test(trimmed)) {
      options.errors?.push(`${envName} must match ${STRIPE_PRICE_ID_RE} (got ${JSON.stringify(fromEnv)})`);
      return "";
    }
    return trimmed;
  }
  if (trimmed) {
    if (!STRIPE_PRICE_ID_RE.test(trimmed)) {
      options.errors?.push(`${envName ?? product.product_code}: Stripe price id must match ${STRIPE_PRICE_ID_RE}`);
      return "";
    }
    return trimmed;
  }
  const fallback = product.stripe_price_id || `price_test_${product.product_code}`;
  return fallback;
}

export function detectSourceLayout(sourceRoot: string): SourceLayout {
  const root = path.resolve(sourceRoot);
  const candidates = [
    path.join(root, "content", "courses"),
    path.join(root, "courses"),
    root,
  ];
  for (const dir of candidates) {
    if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
    const kids = readdirSync(dir);
    const hasCourseJson = kids.some((name) => {
      const json = path.join(dir, name, "course.json");
      return existsSync(json);
    });
    if (hasCourseJson) {
      return { kind: "git", coursesDir: dir, sourceRoot: root };
    }
  }
  return { kind: "box", coursesDir: null, sourceRoot: root };
}

export function collectRewrites(
  manifest: AcademyManifest,
  courseSlug: string,
  sourceMd: string | undefined,
): Rewrite[] {
  const out: Rewrite[] = [];
  const tables = manifest.module_rewrites ?? {};
  for (const [key, list] of Object.entries(tables)) {
    for (const rewrite of list) {
      const target = rewrite.course ?? key;
      if (target !== courseSlug) continue;
      if (sourceMd && rewrite.source && rewrite.source !== sourceMd) continue;
      out.push(rewrite);
    }
  }
  return out;
}

export function scanCopyRules(text: string, where: string, includeZipNav = true): CopyHit[] {
  const hits: CopyHit[] = [];
  const rules = includeZipNav ? COPY_RULES : COPY_RULES.filter((rule) => rule.name !== "zip-nav");
  for (const [i, line] of text.split("\n").entries()) {
    for (const rule of rules) {
      if (rule.pattern.test(line)) {
        hits.push({ where, rule: rule.name, line: i + 1, text: line.trim().slice(0, 140) });
      }
    }
  }
  return hits;
}

function emptySnapshot(): CatalogSnapshot {
  return { courses: {}, lessons: {}, assets: {} };
}

function lessonKey(courseSlug: string, lessonSlug: string): string {
  return `${courseSlug}/${lessonSlug}`;
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => sameValue(item, b[i]));
  }
  return false;
}

function classifyCourse(desired: PlannedCourse, existing?: Record<string, unknown>): OpKind {
  if (!existing) return "insert";
  const fields: (keyof PlannedCourse)[] = [
    "title",
    "summary",
    "sort_order",
    "stripe_price_id",
    "price_cents",
    "currency",
    "product_code",
    "product_codes",
  ];
  const changed = fields.some((field) => !sameValue(desired[field], existing[field]));
  return changed ? "update" : "unchanged";
}

function classifyLesson(desired: PlannedLesson, existing?: Record<string, unknown>): OpKind {
  if (!existing) return "insert";
  const changed =
    desired.title !== existing.title ||
    desired.sort_order !== existing.sort_order ||
    desired.body_md !== existing.body_md ||
    desired.is_preview !== existing.is_preview ||
    !sameValue(desired.duration_minutes, existing.duration_minutes);
  return changed ? "update" : "unchanged";
}

function classifyAsset(desired: PlannedAsset, existing?: Record<string, unknown>): OpKind {
  if (desired.skip) return "skip";
  if (!existing) return "insert";
  const existingCourseSlug = asString(existing.course_slug);
  const existingLessonSlug =
    existing.lesson_slug === undefined ? null : (existing.lesson_slug as string | null);
  const changed =
    desired.label !== existing.label ||
    desired.sha256 !== existing.sha256 ||
    desired.size_bytes !== existing.size_bytes ||
    desired.course_slug !== existingCourseSlug ||
    !sameValue(desired.lesson_slug, existingLessonSlug);
  return changed ? "update" : "unchanged";
}

export function resolveLocalFile(
  ref: string,
  sourceRoot: string,
  assetsDirs: string[] = [],
  context = "path",
): string | null {
  assertSafeRelativeRef(ref, context);
  const allowed = [sourceRoot, ...assetsDirs];
  const tries = [
    path.resolve(sourceRoot, ref),
    ...assetsDirs.flatMap((dir) => [
      path.resolve(dir, ref),
      path.resolve(dir, path.basename(ref)),
    ]),
  ];
  for (const candidate of tries) {
    const found = existingContainedFile(candidate, allowed, context);
    if (found) return found;
  }
  return null;
}

function gitLessonFile(
  layout: SourceLayout,
  courseSlug: string,
  lesson: ManifestLesson,
): string | null {
  if (layout.kind !== "git" || !layout.coursesDir) return null;
  const dir = path.resolve(layout.coursesDir, courseSlug);
  const allowed = [layout.sourceRoot];
  const context = `${courseSlug}/${lesson.slug}`;
  if (lesson.body_md_file) {
    assertSafeRelativeRef(lesson.body_md_file, `${context} body_md_file`);
    const named = existingContainedFile(path.resolve(dir, lesson.body_md_file), allowed, context);
    if (named) return named;
  }
  const sort = lesson.sort_order ?? 0;
  const fallbackName = `${String(sort).padStart(2, "0")}-${lesson.slug}.md`;
  return existingContainedFile(path.resolve(dir, fallbackName), allowed, context);
}

function loadGitCourse(layout: SourceLayout, slug: string): ManifestCourse | null {
  if (layout.kind !== "git" || !layout.coursesDir) return null;
  const file = path.join(layout.coursesDir, slug, "course.json");
  if (!existsSync(file)) return null;
  const parsed = JSON.parse(readFileSync(file, "utf8")) as ManifestCourse;
  return parsed;
}

function sameText(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? null) === (b ?? null);
}

// course.json comes from another repo and wins over the manifest, so say so
// whenever it changes what the manifest declared.
export function courseJsonOverrides(manifestCourse: ManifestCourse, gitCourse: ManifestCourse): string[] {
  const out: string[] = [];
  const slug = manifestCourse.slug;
  if (gitCourse.title !== undefined && !sameText(gitCourse.title, manifestCourse.title)) {
    out.push(
      `${slug}: course.json title ${JSON.stringify(gitCourse.title)} overrides manifest title ${JSON.stringify(manifestCourse.title)}`,
    );
  }
  if (gitCourse.summary !== undefined && !sameText(gitCourse.summary, manifestCourse.summary)) {
    out.push(`${slug}: course.json summary overrides the manifest summary`);
  }
  if (
    gitCourse.assets !== undefined &&
    JSON.stringify(gitCourse.assets) !== JSON.stringify(manifestCourse.assets ?? [])
  ) {
    out.push(`${slug}: course.json assets override the manifest assets`);
  }
  return out;
}

// The manifest decides where an object lives. When course.json swaps in its own
// asset entry for the same bytes, derive the storage path from the manifest's
// entry so both source layouts address one object.
function manifestDeclaration(asset: ManifestAsset, manifestCourse: ManifestCourse): ManifestAsset {
  const sha = assetSha256(asset);
  if (!sha) return asset;
  return courseAssets(manifestCourse).find((candidate) => assetSha256(candidate) === sha) ?? asset;
}

function excludedPrefixes(manifest: AcademyManifest): string[] {
  const extra = (manifest.excluded_asset_sha256_prefixes ?? []).map((item) => item.toLowerCase());
  const defaults = [STALE_COMPLETE_ZIP_PREFIX, SUPERSEDED_COMPLETE_ZIP_PREFIX];
  return [...new Set([...defaults, ...extra])];
}

export type PlanOptions = {
  manifest: AcademyManifest;
  mapping: ProductMapping;
  sourceRoot: string;
  assetsDirs?: string[];
  existing?: CatalogSnapshot;
  env?: NodeJS.Dict<string>;
  sourceCommit?: string | null;
  publish?: boolean;
  requireStripePriceIds?: boolean;
};

export function planImport(options: PlanOptions): ImportPlan {
  const sourceRoot = path.resolve(options.sourceRoot);
  const layout = detectSourceLayout(sourceRoot);
  const assetsDirs = options.assetsDirs ?? [];
  const existing = options.existing ?? emptySnapshot();
  const env = options.env ?? process.env;
  const errors: string[] = [];
  const warnings: string[] = [];
  const copyHits: CopyHit[] = [];
  const courseOps: PlannedOp<PlannedCourse>[] = [];
  const lessonOps: PlannedOp<PlannedLesson>[] = [];
  const assetOps: PlannedOp<PlannedAsset>[] = [];
  const kit = options.manifest.kit_release;
  const prefixes = excludedPrefixes(options.manifest);
  const catalog = options.mapping.products.find((p) => p.product_code === options.mapping.catalogSku);
  if (!catalog) errors.push(`product mapping is missing catalog SKU ${options.mapping.catalogSku}`);
  const stripeOpts = { required: options.requireStripePriceIds === true, errors };
  const publishCatalog = options.publish === true || options.mapping.publishCatalogCourses === true;

  const sharedKitPath = kit ? kitStoragePath(kit) : null;
  const kitOwner = kit?.owner_course ?? options.manifest.courses[0]?.slug;
  let kitClaimed = false;

  for (const [index, manifestCourse] of options.manifest.courses.entries()) {
    const gitCourse = loadGitCourse(layout, manifestCourse.slug);
    const course = gitCourse
      ? {
          ...manifestCourse,
          ...gitCourse,
          slug: manifestCourse.slug,
          lessons: gitCourse.lessons?.length ? gitCourse.lessons : manifestCourse.lessons,
          assets: gitCourse.assets ?? manifestCourse.assets,
          extra_assets: manifestCourse.extra_assets ?? gitCourse.extra_assets,
        }
      : manifestCourse;

    if (gitCourse) warnings.push(...courseJsonOverrides(manifestCourse, gitCourse));

    const codes = productCodesForCourse(options.mapping, course.slug);
    const desiredCourse: PlannedCourse = {
      slug: course.slug,
      title: course.title,
      summary: course.summary ?? null,
      sort_order: course.sort_order ?? index,
      is_published: publishCatalog,
      stripe_price_id: catalog ? resolveStripePriceId(catalog, env, stripeOpts) : null,
      price_cents: catalog?.price_cents ?? options.mapping.launchPriceCents,
      currency: (catalog?.currency ?? options.mapping.currency).toLowerCase(),
      product_code: options.mapping.catalogSku,
      product_codes: codes,
      sku_row: false,
    };
    const existingCourse = existing.courses[course.slug];
    courseOps.push({
      kind: classifyCourse(desiredCourse, existingCourse),
      key: course.slug,
      desired: desiredCourse,
      existing: existingCourse ?? null,
    });

    copyHits.push(...scanCopyRules(desiredCourse.title, `${course.slug}.title`, false));
    if (desiredCourse.summary) {
      copyHits.push(...scanCopyRules(desiredCourse.summary, `${course.slug}.summary`, false));
    }

    const lessonSlugs = new Set(course.lessons.map((lesson) => lesson.slug));
    if (!course.lessons.some((lesson) => lesson.is_preview)) {
      errors.push(`${course.slug}: no is_preview lesson (AC2)`);
    }

    for (const [li, lesson] of course.lessons.entries()) {
      const sortOrder = lesson.sort_order ?? li;
      const sourceMd = lesson.source_md;
      if (sourceMd && isExcludedSourcePath(sourceMd)) {
        errors.push(`${course.slug}/${lesson.slug}: refused excluded source ${sourceMd}`);
        continue;
      }
      let gitFile: string | null = null;
      let boxFile: string | null = null;
      try {
        gitFile = gitLessonFile(layout, course.slug, { ...lesson, sort_order: sortOrder });
        boxFile = gitFile
          ? null
          : sourceMd
            ? resolveLocalFile(sourceMd, sourceRoot, assetsDirs, `${course.slug}/${lesson.slug} source_md`)
            : null;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
        continue;
      }
      const sourcePath = gitFile ?? boxFile;
      const applyRewrites = layout.kind === "box" && !gitFile;

      if (!sourcePath) {
        errors.push(
          `${course.slug}/${lesson.slug}: missing source file (${sourceMd ?? lesson.body_md_file ?? "no path"})`,
        );
        continue;
      }

      let body = readFileSync(sourcePath, "utf8");
      try {
        if (applyRewrites) {
          const rewrites = collectRewrites(options.manifest, course.slug, sourceMd);
          body = applyExactRewrites(body, rewrites, `${course.slug}/${lesson.slug}`);
        }
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
        continue;
      }
      const stripped = stripLeadingH1(body);
      const title = (lesson.title && lesson.title.trim()) || stripped.title;
      if (!title) {
        errors.push(`${course.slug}/${lesson.slug}: no title in manifest or leading H1`);
        continue;
      }
      const desiredLesson: PlannedLesson = {
        course_slug: course.slug,
        slug: lesson.slug,
        title,
        sort_order: sortOrder,
        body_md: stripped.body,
        is_preview: lesson.is_preview === true,
        duration_minutes: lesson.estimated_minutes ?? null,
        source_path: sourcePath,
      };
      copyHits.push(...scanCopyRules(desiredLesson.body_md, `${course.slug}/${lesson.slug}`));
      for (const match of desiredLesson.body_md.matchAll(/\]\(\/academy\/([^/)]+)\/([^)#]+)\)/g)) {
        if (match[1] !== course.slug || !lessonSlugs.has(match[2])) {
          errors.push(`${course.slug}/${lesson.slug}: dead link /academy/${match[1]}/${match[2]}`);
        }
      }
      const key = lessonKey(course.slug, lesson.slug);
      const existingLesson = existing.lessons[key];
      lessonOps.push({
        kind: classifyLesson(desiredLesson, existingLesson),
        key,
        desired: desiredLesson,
        existing: existingLesson ?? null,
      });
    }

    for (const asset of courseAssets(course)) {
      const sha = assetSha256(asset);
      const size = assetSizeBytes(asset);
      const fileRef = assetFileRef(asset);
      const label = asset.label;
      const storagePath = remapStoragePath(manifestDeclaration(asset, manifestCourse), course.slug, kit);

      if (asset.skip) {
        const skipped: PlannedAsset = {
          course_slug: course.slug,
          lesson_slug: asset.lesson_slug ?? null,
          label,
          storage_path: storagePath,
          sha256: sha ?? "",
          size_bytes: size ?? 0,
          local_path: null,
          skip: true,
          skip_reason: "skip=true in manifest",
          shared_kit: false,
        };
        assetOps.push({ kind: "skip", key: storagePath, reason: skipped.skip_reason, desired: skipped });
        continue;
      }

      if (isExcludedSha(sha, prefixes)) {
        const skipped: PlannedAsset = {
          course_slug: course.slug,
          lesson_slug: asset.lesson_slug ?? null,
          label,
          storage_path: storagePath,
          sha256: sha ?? "",
          size_bytes: size ?? 0,
          local_path: null,
          skip: true,
          skip_reason: `excluded sha prefix ${sha?.slice(0, 8)}`,
          shared_kit: false,
        };
        assetOps.push({ kind: "skip", key: `${course.slug}:${storagePath}`, reason: skipped.skip_reason, desired: skipped });
        continue;
      }

      const isKit = !!(kit && sha === kit.sha256);
      if (isKit && sharedKitPath) {
        if (kitClaimed || course.slug !== kitOwner) {
          const skipped: PlannedAsset = {
            course_slug: course.slug,
            lesson_slug: null,
            label,
            storage_path: sharedKitPath,
            sha256: sha ?? "",
            size_bytes: size ?? 0,
            local_path: null,
            skip: true,
            skip_reason: `shared kit object already attached to ${kitOwner}`,
            shared_kit: true,
          };
          assetOps.push({
            kind: "skip",
            key: `${course.slug}:${sharedKitPath}`,
            reason: skipped.skip_reason,
            desired: skipped,
          });
          continue;
        }
        kitClaimed = true;
      }

      if (!sha || size == null) {
        errors.push(`${course.slug}: asset ${label} needs sha256 and size_bytes`);
        continue;
      }
      if (!fileRef) {
        errors.push(`${course.slug}: asset ${label} needs file, source or file_name`);
        continue;
      }

      let localPath: string | null = null;
      try {
        localPath = resolveLocalFile(fileRef, sourceRoot, assetsDirs, `${course.slug} asset ${label}`);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
        continue;
      }
      if (!localPath) {
        errors.push(`${course.slug}: asset ${label}: missing local file ${fileRef}`);
        continue;
      }

      const bytes = readFileSync(localPath);
      try {
        verifyChecksum(bytes, sha, size, `${course.slug}/${label} (${localPath})`);
      } catch (error) {
        const refused: PlannedAsset = {
          course_slug: course.slug,
          lesson_slug: asset.lesson_slug ?? null,
          label,
          storage_path: isKit && sharedKitPath ? sharedKitPath : storagePath,
          sha256: sha,
          size_bytes: size,
          local_path: localPath,
          skip: true,
          skip_reason: error instanceof Error ? error.message : String(error),
          shared_kit: isKit,
        };
        assetOps.push({
          kind: "refuse",
          key: refused.storage_path,
          reason: refused.skip_reason,
          desired: refused,
        });
        errors.push(refused.skip_reason ?? "checksum mismatch");
        continue;
      }

      const desiredAsset: PlannedAsset = {
        course_slug: isKit ? kitOwner ?? course.slug : course.slug,
        lesson_slug: asset.lesson_slug ?? null,
        label,
        storage_path: isKit && sharedKitPath ? sharedKitPath : storagePath,
        sha256: sha,
        size_bytes: size,
        local_path: localPath,
        skip: false,
        shared_kit: isKit,
      };
      const existingAsset = existing.assets[desiredAsset.storage_path];
      assetOps.push({
        kind: classifyAsset(desiredAsset, existingAsset),
        key: desiredAsset.storage_path,
        desired: desiredAsset,
        existing: existingAsset ?? null,
      });
    }
  }

  if (catalog) {
    for (const product of options.mapping.products) {
      if (!product.sku_row) continue;
      const slug = product.slug ?? product.product_code.replaceAll("_", "-");
      const desired: PlannedCourse = {
        slug,
        title: product.title,
        summary: product.summary ?? null,
        sort_order: 1000 + courseOps.length,
        is_published: product.is_published === true,
        stripe_price_id: resolveStripePriceId(product, env, stripeOpts),
        price_cents: product.price_cents,
        currency: product.currency.toLowerCase(),
        product_code: product.product_code,
        product_codes: [product.product_code],
        sku_row: true,
      };
      const existingCourse = existing.courses[slug];
      courseOps.push({
        kind: classifyCourse(desired, existingCourse),
        key: slug,
        desired,
        existing: existingCourse ?? null,
      });
    }
  }

  if (copyHits.length) {
    for (const hit of copyHits) {
      errors.push(`${hit.where}:${hit.line}: [${hit.rule}] ${hit.text}`);
    }
  }

  return {
    layout,
    sourceCommit: options.sourceCommit ?? null,
    publish: publishCatalog,
    courses: courseOps,
    lessons: lessonOps,
    assets: assetOps,
    copyHits,
    errors,
    warnings,
  };
}

export function planHasChanges(plan: ImportPlan): boolean {
  const ops = [...plan.courses, ...plan.lessons, ...plan.assets];
  return ops.some((op) => op.kind === "insert" || op.kind === "update");
}

export function formatDryRun(plan: ImportPlan, flags?: { apply?: boolean; publish?: boolean }): string {
  const apply = flags?.apply === true;
  const publish = flags?.publish === true || plan.publish;
  const lines: string[] = [
    apply ? "Academy import plan (--apply)" : "Academy import plan (dry-run; default, no writes)",
    `Source layout: ${plan.layout.kind}`,
    `Source root: ${plan.layout.sourceRoot}`,
    `Source commit: ${plan.sourceCommit ?? "(not passed; pass --source-commit to pin)"}`,
    apply
      ? "Writes: enabled (--apply). Service role is read only in this mode."
      : "Writes: none. Pass --apply to write. The npm script does not pass --apply.",
    publish
      ? "Publish: yes, as the last step after courses, lessons and assets succeed (--publish requires --apply)."
      : "Publish: no. Pass --publish with --apply to set is_published after content and assets succeed.",
    "",
  ];
  const section = <T,>(title: string, ops: PlannedOp<T>[], describe: (op: PlannedOp<T>) => string) => {
    lines.push(title);
    if (!ops.length) {
      lines.push("  (none)");
      return;
    }
    for (const op of ops) {
      const extra = op.reason ? ` (${op.reason})` : "";
      lines.push(`  ${op.kind.padEnd(9)} ${describe(op)}${extra}`);
    }
    lines.push("");
  };
  section("Courses", plan.courses, (op) => {
    const course = op.desired as PlannedCourse;
    return `${course.slug}  ${course.title}  product_code=${course.product_code}  product_codes=[${course.product_codes.join(",")}]  ${course.price_cents} ${course.currency}${course.sku_row ? "  [sku-row]" : ""}`;
  });
  section("Lessons", plan.lessons, (op) => {
    const lesson = op.desired as PlannedLesson;
    return `${lesson.course_slug}/${lesson.slug}  preview=${lesson.is_preview}  duration_minutes=${lesson.duration_minutes ?? "null"}`;
  });
  section("Assets", plan.assets, (op) => {
    const asset = op.desired as PlannedAsset;
    return `${asset.storage_path}  ${asset.label}  sha256=${asset.sha256.slice(0, 12)}…  ${asset.size_bytes} bytes`;
  });
  lines.push(`Copy checks: ${plan.copyHits.length === 0 ? "PASS" : `${plan.copyHits.length} hit(s)`}`);
  if (plan.warnings.length) {
    lines.push("Warnings:");
    for (const warning of plan.warnings) lines.push(`  ${warning}`);
  }
  if (plan.errors.length) {
    lines.push("Errors:");
    for (const error of plan.errors) lines.push(`  ${error}`);
  } else {
    lines.push("Errors: none");
  }
  const changing = [...plan.courses, ...plan.lessons, ...plan.assets].filter(
    (op) => op.kind === "insert" || op.kind === "update",
  ).length;
  lines.push(`Rerun with the same files and an up-to-date catalog is a no-op (${changing} write(s) in this plan).`);
  return lines.join("\n");
}

export type DbShapedCatalog = {
  courses: Record<string, unknown>[];
  lessons: Record<string, unknown>[];
  assets: Record<string, unknown>[];
};

export function dbShapedCatalogFromPlan(plan: ImportPlan): DbShapedCatalog {
  const courses: Record<string, unknown>[] = [];
  const lessons: Record<string, unknown>[] = [];
  const assets: Record<string, unknown>[] = [];
  const courseIds = new Map<string, string>();
  const lessonIds = new Map<string, string>();

  for (const op of plan.courses) {
    if (op.kind === "skip" || op.kind === "refuse") continue;
    const id = randomUUID();
    courseIds.set(op.desired.slug, id);
    courses.push({
      id,
      slug: op.desired.slug,
      title: op.desired.title,
      summary: op.desired.summary,
      sort_order: op.desired.sort_order,
      is_published: op.desired.is_published,
      stripe_price_id: op.desired.stripe_price_id,
      price_cents: op.desired.price_cents,
      currency: op.desired.currency,
      product_code: op.desired.product_code,
      product_codes: op.desired.product_codes,
    });
  }

  for (const op of plan.lessons) {
    if (op.kind === "skip" || op.kind === "refuse") continue;
    const courseId = courseIds.get(op.desired.course_slug);
    if (!courseId) continue;
    const id = randomUUID();
    lessonIds.set(lessonKey(op.desired.course_slug, op.desired.slug), id);
    lessons.push({
      id,
      course_id: courseId,
      slug: op.desired.slug,
      title: op.desired.title,
      sort_order: op.desired.sort_order,
      body_md: op.desired.body_md,
      is_preview: op.desired.is_preview,
      duration_minutes: op.desired.duration_minutes,
    });
  }

  for (const op of plan.assets) {
    if (op.kind === "skip" || op.kind === "refuse") continue;
    const courseId = courseIds.get(op.desired.course_slug);
    if (!courseId) continue;
    const lessonId = op.desired.lesson_slug
      ? lessonIds.get(lessonKey(op.desired.course_slug, op.desired.lesson_slug)) ?? null
      : null;
    assets.push({
      id: randomUUID(),
      course_id: courseId,
      lesson_id: lessonId,
      label: op.desired.label,
      storage_path: op.desired.storage_path,
      sha256: op.desired.sha256,
      size_bytes: op.desired.size_bytes,
    });
  }

  return { courses, lessons, assets };
}

export function catalogSnapshotFromDbRows(rows: DbShapedCatalog): CatalogSnapshot {
  const snap = emptySnapshot();
  const courseIdToSlug = new Map<string, string>();
  const lessonIdToSlug = new Map<string, string>();

  for (const row of rows.courses) {
    const slug = asString(row.slug);
    const id = asString(row.id);
    if (!slug) continue;
    if (id) courseIdToSlug.set(id, slug);
    snap.courses[slug] = row;
  }

  for (const row of rows.lessons) {
    const slug = asString(row.slug);
    const courseId = asString(row.course_id);
    const courseSlug = courseId ? courseIdToSlug.get(courseId) : undefined;
    if (!slug || !courseSlug) continue;
    const id = asString(row.id);
    if (id) lessonIdToSlug.set(id, slug);
    snap.lessons[lessonKey(courseSlug, slug)] = { ...row, course_slug: courseSlug };
  }

  for (const row of rows.assets) {
    const storagePath = asString(row.storage_path);
    if (!storagePath) continue;
    const courseId = asString(row.course_id);
    const courseSlug = courseId ? courseIdToSlug.get(courseId) ?? null : null;
    const lessonId = row.lesson_id == null ? null : asString(row.lesson_id);
    const lessonSlug = lessonId ? lessonIdToSlug.get(lessonId) ?? null : null;
    snap.assets[storagePath] = {
      ...row,
      course_slug: courseSlug,
      lesson_slug: lessonSlug,
    };
  }

  return snap;
}

export function snapshotFromPlan(plan: ImportPlan): CatalogSnapshot {
  return catalogSnapshotFromDbRows(dbShapedCatalogFromPlan(plan));
}

export function assetsNeedingUpload(plan: ImportPlan): PlannedAsset[] {
  return plan.assets
    .filter((op) => op.kind === "insert" || op.kind === "update")
    .map((op) => op.desired);
}

export function catalogSlugsToPublish(plan: ImportPlan): string[] {
  return plan.courses.filter((op) => !op.desired.sku_row).map((op) => op.desired.slug);
}

export function courseUpsertRow(course: PlannedCourse, mapping: ProductMapping): Record<string, unknown> {
  const row: Record<string, unknown> = {
    slug: course.slug,
    title: course.title,
    summary: course.summary,
    sort_order: course.sort_order,
    stripe_price_id: course.stripe_price_id,
    price_cents: course.price_cents,
    currency: course.currency,
    product_code: course.product_code,
  };
  if (mapping.r2.writeArrayColumn) {
    row[mapping.r2.courseProductCodesColumn] = course.product_codes;
  }
  return row;
}

export type AcademyWriteStore = {
  upsertCourse(row: Record<string, unknown>): Promise<{ id: string; slug: string }>;
  listCourses(): Promise<{ id: string; slug: string }[]>;
  upsertLesson(row: Record<string, unknown>): Promise<{ id: string; slug: string; course_id: string }>;
  listLessons(): Promise<{ id: string; slug: string; course_id: string }[]>;
  uploadAsset(storagePath: string, bytes: Buffer, contentType: string): Promise<void>;
  upsertAsset(row: Record<string, unknown>): Promise<void>;
  publishCatalog(slugs: string[]): Promise<void>;
};

export async function applyPlanWithStore(
  store: AcademyWriteStore,
  plan: ImportPlan,
  mapping: ProductMapping,
  options: { publish: boolean },
): Promise<{ uploaded: string[]; published: string[] }> {
  const uploaded: string[] = [];
  const courseIds = new Map<string, string>();
  const lessonIds = new Map<string, string>();

  for (const op of plan.courses) {
    if (op.kind !== "insert" && op.kind !== "update") continue;
    const data = await store.upsertCourse(courseUpsertRow(op.desired, mapping));
    courseIds.set(data.slug, data.id);
  }

  for (const row of await store.listCourses()) courseIds.set(row.slug, row.id);

  for (const op of plan.lessons) {
    if (op.kind !== "insert" && op.kind !== "update") continue;
    const courseId = courseIds.get(op.desired.course_slug);
    if (!courseId) throw new Error(`lesson ${op.key}: missing course id`);
    const data = await store.upsertLesson({
      course_id: courseId,
      slug: op.desired.slug,
      title: op.desired.title,
      sort_order: op.desired.sort_order,
      body_md: op.desired.body_md,
      is_preview: op.desired.is_preview,
      duration_minutes: op.desired.duration_minutes,
    });
    lessonIds.set(op.key, data.id);
  }

  const idToSlug = new Map([...courseIds.entries()].map(([slug, id]) => [id, slug]));
  for (const row of await store.listLessons()) {
    const courseSlug = idToSlug.get(row.course_id);
    if (courseSlug) lessonIds.set(`${courseSlug}/${row.slug}`, row.id);
  }

  for (const op of plan.assets) {
    if (op.kind === "skip" || op.kind === "refuse" || op.kind === "unchanged") continue;
    const asset = op.desired;
    if (!asset.local_path) throw new Error(`asset ${asset.storage_path}: missing local file`);
    const bytes = readFileSync(asset.local_path);
    verifyChecksum(bytes, asset.sha256, asset.size_bytes, asset.storage_path);
    await store.uploadAsset(asset.storage_path, bytes, "application/zip");
    uploaded.push(asset.storage_path);

    const courseId = courseIds.get(asset.course_slug);
    if (!courseId) throw new Error(`asset ${asset.storage_path}: missing course id`);
    const lessonId = asset.lesson_slug ? lessonIds.get(`${asset.course_slug}/${asset.lesson_slug}`) ?? null : null;
    await store.upsertAsset({
      course_id: courseId,
      lesson_id: lessonId,
      label: asset.label,
      storage_path: asset.storage_path,
      sha256: asset.sha256,
      size_bytes: asset.size_bytes,
    });
  }

  const published: string[] = [];
  if (options.publish) {
    const slugs = catalogSlugsToPublish(plan);
    if (slugs.length) {
      await store.publishCatalog(slugs);
      published.push(...slugs);
    }
  }

  return { uploaded, published };
}

export type ParsedArgs = {
  apply: boolean;
  publish: boolean;
  dryRun: boolean;
  manifest: string | null;
  sourceRoot: string | null;
  sourceCommit: string | null;
  productMapping: string | null;
  assetsDir: string[];
  priceSwitch: boolean;
  stripePriceId: string | null;
  help: boolean;
};

export function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = {
    apply: false,
    publish: false,
    dryRun: true,
    manifest: null,
    sourceRoot: null,
    sourceCommit: null,
    productMapping: null,
    assetsDir: [],
    priceSwitch: false,
    stripePriceId: null,
    help: false,
  };
  let sawDryRun = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      i += 1;
      return argv[i];
    };
    if (arg === "--dry-run") sawDryRun = true;
    else if (arg === "--apply") out.apply = true;
    else if (arg === "--publish") out.publish = true;
    else if (arg === "--manifest") out.manifest = next();
    else if (arg === "--source-root") out.sourceRoot = next();
    else if (arg === "--source-commit") out.sourceCommit = next();
    else if (arg === "--product-mapping") out.productMapping = next();
    else if (arg === "--assets-dir") out.assetsDir.push(next());
    else if (arg === "--price-switch") out.priceSwitch = true;
    else if (arg === "--stripe-price-id") out.stripePriceId = next();
    else if (arg === "--help" || arg === "-h") out.help = true;
    else if (arg.startsWith("--manifest=")) out.manifest = arg.slice("--manifest=".length);
    else if (arg.startsWith("--source-root=")) out.sourceRoot = arg.slice("--source-root=".length);
    else if (arg.startsWith("--source-commit=")) out.sourceCommit = arg.slice("--source-commit=".length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (out.apply && sawDryRun) {
    throw new Error("pass only one of --apply and --dry-run");
  }
  if (out.publish && !out.apply) {
    throw new Error("--publish requires --apply");
  }
  out.dryRun = !out.apply;
  return out;
}

export const HELP = `Academy import (elsa-hub#40)

  npx tsx scripts/academy-import.ts \\
    --manifest academy/lesson-plan.json \\
    --source-root /path/to/sources \\
    --source-commit <git sha> \\
    [--assets-dir /path/to/zips] \\
    [--product-mapping academy/product-mapping.json] \\
    [--apply] [--publish]

  npx tsx scripts/academy-import.ts --price-switch --stripe-price-id price_... [--apply]

Dry-run is the default. Every database or storage write needs --apply
(including --price-switch). --publish also needs --apply; it sets
is_published on catalog courses only after content and assets succeed.
npm run academy:import does not pass --apply.

--source-root may be a box checkout (lesson source_md paths) or a
valence-works/elsa-plus-training content/courses tree (course.json + NN-<slug>.md).
Lesson and asset paths must stay inside --source-root or --assets-dir.
Absolute paths and .. are refused.

SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are read from the environment
only with --apply, and are never written to the repo.
`;
