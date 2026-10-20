import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  STALE_COMPLETE_ZIP_PREFIX,
  SUPERSEDED_COMPLETE_ZIP_PREFIX,
  STRIPE_PRICE_ID_RE,
  applyExactRewrites,
  applyPlanWithStore,
  assetsNeedingUpload,
  assertStripePriceId,
  catalogSnapshotFromDbRows,
  contentTypeFor,
  catalogSlugsToPublish,
  courseUpsertRow,
  dbShapedCatalogFromPlan,
  digestBytes,
  formatDryRun,
  parseArgs,
  runPriceSwitch,
  planImport,
  productCodesForCourse,
  stripLeadingH1,
  validateManifest,
  validateProductMapping,
  verifyChecksum,
  type AcademyManifest,
  type AcademyWriteStore,
  type PriceSwitchStore,
  type ProductMapping,
} from "./academy-import-lib";

const mapping: ProductMapping = {
  catalogSku: "solo_bundle",
  currency: "eur",
  launchPriceCents: 2900,
  postLaunchPriceCents: 3900,
  courseOwnCodes: { "demo-core": null },
  r2: { courseProductCodesColumn: "product_codes", writeArrayColumn: true },
  products: [
    {
      product_code: "solo_bundle",
      title: "Solo Bundle",
      price_cents: 2900,
      currency: "eur",
      seats: 1,
      covers: ["demo-core"],
      stripe_price_id: "price_test_solo_bundle",
      stripe_price_id_env: "STRIPE_PRICE_ID_SOLO_BUNDLE",
    },
    {
      product_code: "team_5",
      title: "Team 5",
      slug: "team-5",
      price_cents: 34900,
      currency: "eur",
      seats: 5,
      covers: ["demo-core"],
      stripe_price_id: "price_test_team_5",
      stripe_price_id_env: "STRIPE_PRICE_ID_TEAM_5",
      sku_row: true,
      is_published: false,
    },
  ],
};

const tmpDirs: string[] = [];

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tmpDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "academy-import-"));
  tmpDirs.push(dir);
  return dir;
}

function writeTree(root: string, files: Record<string, string | Buffer>): void {
  for (const [rel, contents] of Object.entries(files)) {
    const full = path.join(root, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, contents);
  }
}

const welcomeBody = `Get the kit running locally.

Proceed to [paid](/academy/demo-core/paid).
`;
const paidBody = `Build the paid lab from the unzipped kit folder.
`;

function boxManifest(overrides: Record<string, unknown> = {}): AcademyManifest {
  return {
    elsa_version: "3.9.0",
    kit_release: {
      tag: "workshop/solo-bundle-20261013",
      asset: "kit.zip",
      sha256: "0".repeat(64),
      bytes: 0,
      storage_path: "kits/solo-bundle-20261013/kit.zip",
      owner_course: "demo-core",
    },
    excluded_asset_sha256_prefixes: [STALE_COMPLETE_ZIP_PREFIX, SUPERSEDED_COMPLETE_ZIP_PREFIX],
    module_rewrites: {
      "demo-core": [
        {
          source: "modules/welcome.md",
          from: "Proceed to paid.",
          to: "Proceed to [paid](/academy/demo-core/paid).",
        },
      ],
    },
    courses: [
      {
        slug: "demo-core",
        title: "Demo Core",
        summary: "A tiny catalog course for importer tests.",
        sort_order: 0,
        lessons: [
          {
            slug: "welcome",
            title: "Welcome",
            source_md: "modules/welcome.md",
            sort_order: 0,
            is_preview: true,
            estimated_minutes: 5,
          },
          {
            slug: "paid",
            title: "Paid lab",
            source_md: "modules/paid.md",
            sort_order: 1,
            is_preview: false,
            estimated_minutes: 20,
          },
        ],
        assets: [],
        extra_assets: [],
      },
    ],
    ...overrides,
  } as AcademyManifest;
}

function memoryStore(seed?: { courses?: { id: string; slug: string }[] }): AcademyWriteStore & {
  calls: string[];
  uploads: string[];
  contentTypes: Record<string, string>;
  courseRows: Record<string, unknown>[];
} {
  const calls: string[] = [];
  const uploads: string[] = [];
  const contentTypes: Record<string, string> = {};
  const courseRows: Record<string, unknown>[] = [];
  const courses = [...(seed?.courses ?? [])];
  return {
    calls,
    uploads,
    contentTypes,
    courseRows,
    async upsertCourse(row) {
      calls.push(`course:${String(row.slug)}`);
      courseRows.push(row);
      expect(row).not.toHaveProperty("is_published");
      const existing = courses.find((c) => c.slug === row.slug);
      if (existing) return existing;
      const created = { id: `course-${row.slug}`, slug: String(row.slug) };
      courses.push(created);
      return created;
    },
    async listCourses() {
      calls.push("listCourses");
      return courses;
    },
    async upsertLesson(row) {
      calls.push(`lesson:${String(row.slug)}`);
      return { id: `lesson-${row.slug}`, slug: String(row.slug), course_id: String(row.course_id) };
    },
    async listLessons() {
      calls.push("listLessons");
      return [];
    },
    async uploadAsset(storagePath, _bytes, contentType) {
      calls.push(`upload:${storagePath}`);
      contentTypes[storagePath] = contentType;
      uploads.push(storagePath);
    },
    async upsertAsset(row) {
      calls.push(`asset:${String(row.storage_path)}`);
    },
    async publishCatalog(slugs) {
      calls.push(`publish:${slugs.join(",")}`);
    },
  };
}

describe("manifest validation", () => {
  it("accepts a catalog course with extra_assets", () => {
    const extra = {
      label: "Extra handout",
      file: "extras/handout.zip",
      sha256: "a".repeat(64),
      size_bytes: 12,
      storage_path: "extras/demo-core/handout.zip",
    };
    const result = validateManifest(
      boxManifest({
        courses: [
          {
            ...boxManifest().courses[0],
            extra_assets: [extra],
          },
        ],
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("rejects a course with no preview lesson", () => {
    const manifest = boxManifest();
    manifest.courses[0].lessons = manifest.courses[0].lessons.map((lesson) => ({
      ...lesson,
      is_preview: false,
    }));
    const result = validateManifest(manifest);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => /is_preview/.test(error))).toBe(true);
  });

  it("rejects a bad asset sha256", () => {
    const manifest = boxManifest();
    manifest.courses[0].assets = [
      { label: "bad", sha256: "not-a-hash", size_bytes: 1, file: "x.bin" },
    ];
    const result = validateManifest(manifest);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => /sha256/.test(error))).toBe(true);
  });

  it("validates the committed Academy product mapping", async () => {
    const { readFileSync } = await import("node:fs");
    const raw = JSON.parse(readFileSync("academy/product-mapping.json", "utf8"));
    const result = validateProductMapping(raw);
    expect(result.ok).toBe(true);
    expect(result.mapping).not.toHaveProperty("publishCatalogCourses");
    const codes = productCodesForCourse(result.mapping!, "fundamentals-complete");
    expect(codes[0]).toBe("solo_bundle");
    expect(codes).toContain("team_5");
    expect(codes).toContain("team_10");
  });

  it("accepts the committed lesson-plan.json", async () => {
    const { readFileSync } = await import("node:fs");
    const raw = JSON.parse(readFileSync("academy/lesson-plan.json", "utf8"));
    const result = validateManifest(raw);
    expect(result.ok).toBe(true);
    expect(result.manifest?.courses.map((course) => course.slug)).toEqual([
      "fundamentals-core",
      "fundamentals-complete",
      "advanced-patterns",
    ]);
    expect(result.manifest?.courses.reduce((n, course) => n + course.lessons.length, 0)).toBe(31);
  });
});

describe("rewrites and H1", () => {
  it("strips a leading H1 and keeps the rest", () => {
    const stripped = stripLeadingH1("# Module 0: Start here\n\nHello.\n");
    expect(stripped.title).toBe("Module 0: Start here");
    expect(stripped.body).toBe("Hello.\n");
  });

  it("fails loudly when a rewrite target is missing", () => {
    expect(() =>
      applyExactRewrites("no match here", [{ from: "Proceed to paid.", to: "x" }], "demo-core/welcome"),
    ).toThrow(/not found or not unique \(0 hits\)/);
  });
});

describe("flags and stripe guards", () => {
  it("defaults to dry-run and requires --apply for writes", () => {
    expect(parseArgs([]).dryRun).toBe(true);
    expect(parseArgs([]).apply).toBe(false);
    expect(parseArgs([]).publish).toBe(false);
    expect(parseArgs(["--apply"]).apply).toBe(true);
    expect(parseArgs(["--apply"]).dryRun).toBe(false);
    expect(parseArgs(["--apply", "--publish"]).publish).toBe(true);
    expect(parseArgs([]).setPrices).toBe(false);
    expect(parseArgs([]).compareLive).toBe(false);
    expect(parseArgs(["--set-prices", "--compare-live"])).toMatchObject({ setPrices: true, compareLive: true, apply: false });
    expect(parseArgs(["--set-prices=team_5, team_10", "--apply"]).setPrices).toEqual(["team_5", "team_10"]);
    expect(() => parseArgs(["--set-prices"])).toThrow(/needs the live catalog/);
    expect(() => parseArgs(["--set-prices=team_5"])).toThrow(/needs the live catalog/);
    expect(() => parseArgs(["--set-prices=", "--apply"])).toThrow(/comma list of product codes/);
    expect(() => parseArgs(["--set-prices=Team 5", "--apply"])).toThrow(/comma list of product codes/);
    expect(() => parseArgs(["--publish"])).toThrow(/--publish requires --apply/);
    expect(() => parseArgs(["--apply", "--dry-run"])).toThrow(/only one of --apply and --dry-run/);
  });

  it("does not pass --apply from the npm scripts", async () => {
    const { readFileSync } = await import("node:fs");
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };
    expect(pkg.scripts["academy:import"]).toBe("tsx scripts/academy-import.ts");
    expect(pkg.scripts["academy:import"]).not.toMatch(/--apply/);
    expect(pkg.scripts["academy:price-switch"]).toBe("tsx scripts/academy-import.ts --price-switch");
    expect(pkg.scripts["academy:price-switch"]).not.toMatch(/--apply/);
  });

  it("rejects empty or non-price_ stripe ids", () => {
    expect(() => assertStripePriceId("")).toThrow(/must match/);
    expect(() => assertStripePriceId("   ")).toThrow(/must match/);
    expect(() => assertStripePriceId("prod_123")).toThrow(/must match/);
    expect(assertStripePriceId("price_abc123")).toBe("price_abc123");
    expect(assertStripePriceId("price_test_solo_bundle")).toBe("price_test_solo_bundle");
    expect(STRIPE_PRICE_ID_RE.test("")).toBe(false);
    expect(STRIPE_PRICE_ID_RE.test("price_test_team_5")).toBe(true);
  });

  it("fails apply planning when a needed STRIPE_PRICE_ID_* is missing", () => {
    const root = tmpDir();
    writeTree(root, {
      "modules/welcome.md": `# Welcome\n\nProceed to paid.\n`,
      "modules/paid.md": paidBody,
    });
    const plan = planImport({
      manifest: boxManifest(),
      mapping,
      sourceRoot: root,
      env: {},
      requireStripePriceIds: true,
    });
    expect(plan.errors.some((error) => /STRIPE_PRICE_ID_SOLO_BUNDLE is required under --apply/.test(error))).toBe(
      true,
    );
  });

  it("keeps the price_ guard in academy-price-switch.sql", async () => {
    const { readFileSync } = await import("node:fs");
    const sql = readFileSync("scripts/academy-price-switch.sql", "utf8");
    expect(sql).toMatch(/\^price_\[A-Za-z0-9_\]\+\$/);
    expect(sql).toMatch(/RAISE EXCEPTION/);
  });

  it("never interpolates a psql variable inside a dollar-quoted block", async () => {
    // psql does not substitute :'var' inside $tag$ ... $tag$, so the server sees
    // the literal text and the whole script fails with a syntax error.
    const { readFileSync } = await import("node:fs");
    const sql = readFileSync("scripts/academy-price-switch.sql", "utf8");
    const quoted = [...sql.matchAll(/(\$[A-Za-z_]*\$)([\s\S]*?)\1/g)].map((match) => match[2]);
    expect(quoted.length).toBeGreaterThan(0);
    for (const body of quoted) expect(body).not.toMatch(/:'?[A-Za-z_]+'?/);
    expect(sql).toMatch(/set_config\('academy\.stripe_price_id', :'stripe_price_id'/);
  });
});

describe("import planning", () => {
  it("plans an idempotent upsert and maps duration_minutes", () => {
    const root = tmpDir();
    writeTree(root, {
      "modules/welcome.md": `# Welcome\n\nProceed to paid.\n`,
      "modules/paid.md": `# Paid lab\n\n${paidBody}`,
    });
    const kit = Buffer.from("kit-bytes");
    const kitDigest = digestBytes(kit);
    const extra = Buffer.from("extra-asset-bytes");
    const extraDigest = digestBytes(extra);
    writeTree(root, {
      "kits/kit.zip": kit,
      "extras/handout.zip": extra,
    });

    const manifest = boxManifest();
    manifest.kit_release = {
      tag: "workshop/solo-bundle-20261013",
      asset: "kit.zip",
      sha256: kitDigest.sha256,
      bytes: kitDigest.sizeBytes,
      storage_path: "kits/solo-bundle-20261013/kit.zip",
      owner_course: "demo-core",
    };
    manifest.courses[0].assets = [
      {
        label: "Lab kit",
        source: "kits/kit.zip",
        sha256: kitDigest.sha256,
        size_bytes: kitDigest.sizeBytes,
      },
    ];
    manifest.courses[0].extra_assets = [
      {
        label: "Extra handout",
        file: "extras/handout.zip",
        sha256: extraDigest.sha256,
        size_bytes: extraDigest.sizeBytes,
        storage_path: "extras/demo-core/handout.zip",
      },
    ];

    const first = planImport({ manifest, mapping, sourceRoot: root });
    expect(first.errors).toEqual([]);
    expect(first.layout.kind).toBe("box");
    expect(first.publish).toBe(false);
    expect(first.courses[0].desired.is_published).toBe(false);
    expect(first.lessons.map((op) => op.kind)).toEqual(["insert", "insert"]);
    expect(first.lessons[0].desired.duration_minutes).toBe(5);
    expect(first.lessons[0].desired.body_md).toContain("/academy/demo-core/paid");
    expect(first.lessons[0].desired.body_md).not.toMatch(/^# /);
    expect(first.courses[0].desired.product_code).toBe("solo_bundle");
    expect(first.courses[0].desired.product_codes[0]).toBe("solo_bundle");
    expect(first.courses[0].desired.product_codes).toContain("team_5");
    expect(first.assets.some((op) => op.desired.storage_path === "kits/solo-bundle-20261013/kit.zip")).toBe(true);
    expect(first.assets.some((op) => op.desired.storage_path === "extras/demo-core/handout.zip" && op.kind === "insert")).toBe(
      true,
    );

    const dbRows = dbShapedCatalogFromPlan(first);
    expect(dbRows.assets.every((row) => row.course_id && !("course_slug" in row))).toBe(true);
    expect(dbRows.assets.every((row) => !("lesson_slug" in row))).toBe(true);
    const second = planImport({
      manifest,
      mapping,
      sourceRoot: root,
      existing: catalogSnapshotFromDbRows(dbRows),
    });
    expect(second.errors).toEqual([]);
    expect(second.courses.every((op) => op.kind === "unchanged")).toBe(true);
    expect(second.lessons.every((op) => op.kind === "unchanged")).toBe(true);
    expect(second.assets.filter((op) => !op.desired.skip).every((op) => op.kind === "unchanged")).toBe(true);
    expect(assetsNeedingUpload(second)).toEqual([]);
    expect(formatDryRun(second)).toMatch(/no-op/);
  });

  it("uploads nothing on a second apply against DB-shaped asset rows", async () => {
    const root = tmpDir();
    const kit = Buffer.from("kit-bytes");
    const kitDigest = digestBytes(kit);
    writeTree(root, {
      "modules/welcome.md": `# Welcome\n\nProceed to paid.\n`,
      "modules/paid.md": paidBody,
      "kits/kit.zip": kit,
    });
    const manifest = boxManifest();
    manifest.kit_release = {
      tag: "workshop/solo-bundle-20261013",
      asset: "kit.zip",
      sha256: kitDigest.sha256,
      bytes: kitDigest.sizeBytes,
      storage_path: "kits/solo-bundle-20261013/kit.zip",
      owner_course: "demo-core",
    };
    manifest.courses[0].assets = [
      {
        label: "Lab kit",
        source: "kits/kit.zip",
        sha256: kitDigest.sha256,
        size_bytes: kitDigest.sizeBytes,
      },
    ];
    const first = planImport({
      manifest,
      mapping,
      sourceRoot: root,
      env: { STRIPE_PRICE_ID_SOLO_BUNDLE: "price_test_solo_bundle", STRIPE_PRICE_ID_TEAM_5: "price_test_team_5" },
    });
    expect(first.errors).toEqual([]);
    expect(assetsNeedingUpload(first).length).toBeGreaterThan(0);

    const existing = catalogSnapshotFromDbRows(dbShapedCatalogFromPlan(first));
    const second = planImport({
      manifest,
      mapping,
      sourceRoot: root,
      existing,
      env: { STRIPE_PRICE_ID_SOLO_BUNDLE: "price_test_solo_bundle", STRIPE_PRICE_ID_TEAM_5: "price_test_team_5" },
    });
    expect(assetsNeedingUpload(second)).toEqual([]);
    const store = memoryStore();
    const result = await applyPlanWithStore(store, second, mapping, { publish: false });
    expect(result.uploaded).toEqual([]);
    expect(store.uploads).toEqual([]);
    expect(store.calls.some((call) => call.startsWith("upload:"))).toBe(false);
  });

  it("refuses an upload when sha256 or size_bytes do not match the local file", () => {
    const root = tmpDir();
    const bytes = Buffer.from("real-kit");
    writeTree(root, {
      "modules/welcome.md": `# Welcome\n\nProceed to paid.\n`,
      "modules/paid.md": paidBody,
      "kits/kit.zip": bytes,
    });
    const manifest = boxManifest();
    manifest.courses[0].assets = [
      {
        label: "Lab kit",
        source: "kits/kit.zip",
        sha256: "b".repeat(64),
        size_bytes: 99,
      },
    ];
    const plan = planImport({ manifest, mapping, sourceRoot: root });
    expect(plan.assets.some((op) => op.kind === "refuse")).toBe(true);
    expect(plan.errors.some((error) => /Checksum mismatch/.test(error))).toBe(true);
    expect(() => verifyChecksum(bytes, "b".repeat(64), 99, "kit")).toThrow(/Upload refused/);
  });

  it("skips the stale Complete zip prefix 7380ab47", () => {
    const root = tmpDir();
    writeTree(root, {
      "modules/welcome.md": `# Welcome\n\nProceed to paid.\n`,
      "modules/paid.md": paidBody,
      "packs/stale.zip": Buffer.from("stale"),
    });
    const staleSha = STALE_COMPLETE_ZIP_PREFIX;
    const manifest = boxManifest();
    manifest.courses[0].assets = [
      {
        label: "Stale Complete zip",
        source: "packs/stale.zip",
        sha256: staleSha,
        size_bytes: 5,
      },
    ];
    const plan = planImport({ manifest, mapping, sourceRoot: root });
    const skipped = plan.assets.find((op) => op.kind === "skip");
    expect(skipped?.reason).toMatch(/excluded sha prefix 7380ab47/);
  });

  it("skips the superseded Complete zip prefix 464b8b0a", () => {
    const root = tmpDir();
    writeTree(root, {
      "modules/welcome.md": `# Welcome\n\nProceed to paid.\n`,
      "modules/paid.md": paidBody,
      "packs/superseded.zip": Buffer.from("superseded"),
    });
    const supersededSha = SUPERSEDED_COMPLETE_ZIP_PREFIX;
    const manifest = boxManifest();
    manifest.courses[0].assets = [
      {
        label: "Superseded Complete zip",
        source: "packs/superseded.zip",
        sha256: supersededSha,
        size_bytes: 10,
      },
    ];
    const plan = planImport({ manifest, mapping, sourceRoot: root });
    const skipped = plan.assets.find((op) => op.kind === "skip");
    expect(skipped?.reason).toMatch(/excluded sha prefix 464b8b0a/);
  });

  it("reads git content/courses bodies without re-applying box rewrites", () => {
    const root = tmpDir();
    writeTree(root, {
      "content/courses/demo-core/course.json": JSON.stringify({
        slug: "demo-core",
        title: "Demo Core",
        summary: "Git layout course.",
        sort_order: 0,
        lessons: [
          {
            slug: "welcome",
            title: "Welcome",
            sort_order: 0,
            is_preview: true,
            body_md_file: "00-welcome.md",
            estimated_minutes: 5,
          },
          {
            slug: "paid",
            title: "Paid lab",
            sort_order: 1,
            is_preview: false,
            body_md_file: "01-paid.md",
            estimated_minutes: 20,
          },
        ],
        assets: [],
      }),
      "content/courses/demo-core/00-welcome.md": welcomeBody,
      "content/courses/demo-core/01-paid.md": paidBody,
    });
    const plan = planImport({
      manifest: boxManifest(),
      mapping,
      sourceRoot: root,
    });
    expect(plan.layout.kind).toBe("git");
    expect(plan.errors).toEqual([]);
    expect(plan.lessons[0].desired.body_md).toBe(welcomeBody);
  });
});

describe("path containment", () => {
  it("refuses absolute source_md and does not copy an outside file into the lesson body", () => {
    const root = tmpDir();
    const outside = path.join(os.tmpdir(), `academy-outside-${process.pid}.md`);
    writeFileSync(outside, "SECRET OUTSIDE FILE\n");
    writeTree(root, {
      "modules/welcome.md": `# Welcome\n\nProceed to paid.\n`,
      "modules/paid.md": paidBody,
    });
    const manifest = boxManifest();
    manifest.courses[0].lessons[0].source_md = outside;
    const plan = planImport({ manifest, mapping, sourceRoot: root });
    expect(plan.errors.some((error) => /refused path/.test(error))).toBe(true);
    expect(plan.lessons.some((op) => op.desired.body_md.includes("SECRET OUTSIDE FILE"))).toBe(false);
  });

  it("refuses .. path traversal for lessons and assets", () => {
    const root = tmpDir();
    const parent = path.join(root, "..", `escape-${process.pid}.md`);
    writeFileSync(parent, "TRAVERSAL\n");
    writeTree(root, {
      "modules/welcome.md": `# Welcome\n\nProceed to paid.\n`,
      "modules/paid.md": paidBody,
    });
    const manifest = boxManifest();
    manifest.courses[0].lessons[1].source_md = `../escape-${process.pid}.md`;
    const plan = planImport({ manifest, mapping, sourceRoot: root });
    expect(plan.errors.some((error) => /\.\./.test(error))).toBe(true);
    expect(plan.lessons.some((op) => op.desired.body_md.includes("TRAVERSAL"))).toBe(false);

    const kit = Buffer.from("kit");
    const digest = digestBytes(kit);
    manifest.courses[0].lessons[1].source_md = "modules/paid.md";
    manifest.courses[0].assets = [
      {
        label: "Escaping zip",
        file: "../escape.zip",
        sha256: digest.sha256,
        size_bytes: digest.sizeBytes,
      },
    ];
    const assetPlan = planImport({ manifest, mapping, sourceRoot: root });
    expect(assetPlan.errors.some((error) => /refused path/.test(error))).toBe(true);
  });

  it("refuses a symlink that resolves outside source-root and assets-dir", () => {
    const root = tmpDir();
    const outside = path.join(os.tmpdir(), `academy-symlink-${process.pid}.md`);
    writeFileSync(outside, "SYMLINK SECRET\n");
    writeTree(root, {
      "modules/paid.md": paidBody,
    });
    symlinkSync(outside, path.join(root, "modules", "welcome.md"));
    const plan = planImport({ manifest: boxManifest(), mapping, sourceRoot: root });
    expect(plan.errors.some((error) => /outside --source-root/.test(error))).toBe(true);
    expect(plan.lessons.some((op) => op.desired.body_md.includes("SYMLINK SECRET"))).toBe(false);
  });
});

describe("apply plan", () => {
  it("publishes catalog courses only after content and assets succeed", async () => {
    const root = tmpDir();
    const kit = Buffer.from("kit-bytes");
    const kitDigest = digestBytes(kit);
    writeTree(root, {
      "modules/welcome.md": `# Welcome\n\nProceed to paid.\n`,
      "modules/paid.md": paidBody,
      "kits/kit.zip": kit,
    });
    const manifest = boxManifest();
    manifest.kit_release = {
      tag: "workshop/solo-bundle-20261013",
      asset: "kit.zip",
      sha256: kitDigest.sha256,
      bytes: kitDigest.sizeBytes,
      storage_path: "kits/solo-bundle-20261013/kit.zip",
      owner_course: "demo-core",
    };
    manifest.courses[0].assets = [
      {
        label: "Lab kit",
        source: "kits/kit.zip",
        sha256: kitDigest.sha256,
        size_bytes: kitDigest.sizeBytes,
      },
    ];
    const plan = planImport({ manifest, mapping, sourceRoot: root, publish: true });
    expect(plan.errors).toEqual([]);
    expect(courseUpsertRow(plan.courses[0].desired, mapping)).not.toHaveProperty("is_published");
    expect(catalogSlugsToPublish(plan)).toEqual(["demo-core"]);
    expect(catalogSlugsToPublish(plan)).not.toContain("team-5");

    const store = memoryStore();
    const result = await applyPlanWithStore(store, plan, mapping, { publish: true });
    expect(result.uploaded.length).toBeGreaterThan(0);
    expect(result.published).toEqual(["demo-core"]);
    const publishAt = store.calls.findIndex((call) => call.startsWith("publish:"));
    const lastUpload = store.calls.map((call, i) => (call.startsWith("upload:") ? i : -1)).filter((i) => i >= 0).at(-1) ?? -1;
    expect(publishAt).toBeGreaterThan(lastUpload);
    expect(store.calls[publishAt]).toBe("publish:demo-core");
  });

  it("does not publish when an asset upload fails", async () => {
    const root = tmpDir();
    const kit = Buffer.from("kit-bytes");
    const kitDigest = digestBytes(kit);
    writeTree(root, {
      "modules/welcome.md": `# Welcome\n\nProceed to paid.\n`,
      "modules/paid.md": paidBody,
      "kits/kit.zip": kit,
    });
    const manifest = boxManifest();
    manifest.kit_release = {
      tag: "workshop/solo-bundle-20261013",
      asset: "kit.zip",
      sha256: kitDigest.sha256,
      bytes: kitDigest.sizeBytes,
      storage_path: "kits/solo-bundle-20261013/kit.zip",
      owner_course: "demo-core",
    };
    manifest.courses[0].assets = [
      {
        label: "Lab kit",
        source: "kits/kit.zip",
        sha256: kitDigest.sha256,
        size_bytes: kitDigest.sizeBytes,
      },
    ];
    const plan = planImport({ manifest, mapping, sourceRoot: root, publish: true });
    const store = memoryStore();
    store.uploadAsset = async () => {
      store.calls.push("upload:fail");
      throw new Error("upload failed");
    };
    await expect(applyPlanWithStore(store, plan, mapping, { publish: true })).rejects.toThrow(/upload failed/);
    expect(store.calls.some((call) => call.startsWith("publish:"))).toBe(false);
  });
});

describe("course.json versus the manifest", () => {
  const gitTree = (extraCourseJson: Record<string, unknown> = {}) => ({
    "content/courses/demo-core/course.json": JSON.stringify({
      slug: "demo-core",
      title: "Demo Core",
      summary: "A tiny catalog course for importer tests.",
      sort_order: 0,
      lessons: [
        { slug: "welcome", title: "Welcome", sort_order: 0, is_preview: true, body_md_file: "00-welcome.md" },
      ],
      ...extraCourseJson,
    }),
    "content/courses/demo-core/00-welcome.md": welcomeBody,
  });

  it("warns when course.json overrides the manifest title, summary or assets", () => {
    const root = tmpDir();
    writeTree(root, gitTree({ title: "Renamed Core", summary: "Different.", assets: [] }));
    const manifest = boxManifest();
    manifest.courses[0].assets = [{ label: "Offline copy", source: "a/b.zip", sha256: "1".repeat(64), size_bytes: 1 }];
    const plan = planImport({ manifest, mapping, sourceRoot: root });
    expect(plan.warnings).toEqual([
      'demo-core: course.json title "Renamed Core" overrides manifest title "Demo Core"',
      "demo-core: course.json summary overrides the manifest summary",
      "demo-core: course.json assets override the manifest assets",
    ]);
    expect(formatDryRun(plan)).toContain("course.json title");
  });

  it("stays quiet when course.json agrees with the manifest", () => {
    const root = tmpDir();
    writeTree(root, gitTree());
    expect(planImport({ manifest: boxManifest(), mapping, sourceRoot: root }).warnings).toEqual([]);
  });

  it("addresses one storage object whichever source layout supplies the asset", () => {
    const zip = Buffer.from("core-zip-bytes");
    const digest = digestBytes(zip);
    const manifestAsset = {
      label: "Offline copy",
      source: "self-paced/packaging/elsa-3.9.0/core.zip",
      sha256: digest.sha256,
      size_bytes: digest.sizeBytes,
    };
    const manifest = boxManifest();
    manifest.courses[0].assets = [manifestAsset];

    const boxRoot = tmpDir();
    writeTree(boxRoot, {
      "modules/welcome.md": `# Welcome\n\nProceed to paid.\n`,
      "modules/paid.md": paidBody,
      "self-paced/packaging/elsa-3.9.0/core.zip": zip,
    });
    const gitRoot = tmpDir();
    writeTree(gitRoot, {
      ...gitTree({
        assets: [{ label: "Offline copy", file: "core.zip", sha256: digest.sha256, size_bytes: digest.sizeBytes }],
      }),
      "zips/core.zip": zip,
    });

    const box = planImport({ manifest, mapping, sourceRoot: boxRoot });
    const git = planImport({ manifest, mapping, sourceRoot: gitRoot, assetsDirs: [path.join(gitRoot, "zips")] });
    expect(box.assets.map((op) => op.desired.storage_path)).toEqual(["courses/elsa-3.9.0/core.zip"]);
    expect(git.assets.map((op) => op.desired.storage_path)).toEqual(["courses/elsa-3.9.0/core.zip"]);
  });
});

const SOLO_ENV = {
  STRIPE_PRICE_ID_SOLO_BUNDLE: "price_test_solo_bundle",
  STRIPE_PRICE_ID_TEAM_5: "price_test_team_5",
};

function simpleRoot(): string {
  const root = tmpDir();
  writeTree(root, {
    "modules/welcome.md": `# Welcome\n\nProceed to paid.\n`,
    "modules/paid.md": paidBody,
  });
  return root;
}

// The catalog as the database holds it after the 1 Nov switch.
function switchedCatalog(root: string) {
  const first = planImport({ manifest: boxManifest(), mapping, sourceRoot: root, env: SOLO_ENV });
  const rows = dbShapedCatalogFromPlan(first);
  for (const course of rows.courses) {
    if (course.product_code === "solo_bundle") {
      course.price_cents = 3900;
      course.stripe_price_id = "price_nov1";
    }
  }
  return catalogSnapshotFromDbRows(rows);
}

describe("prices on existing rows", () => {
  it("leaves a switched Solo price alone on a plain --apply rerun", async () => {
    const root = simpleRoot();
    const existing = switchedCatalog(root);
    // No STRIPE_PRICE_ID_* in the env: nothing is being written, so none is needed.
    const plan = planImport({
      manifest: boxManifest(),
      mapping,
      sourceRoot: root,
      existing,
      env: {},
      requireStripePriceIds: true,
    });
    expect(plan.errors).toEqual([]);
    const solo = plan.courses.find((op) => op.key === "demo-core")!;
    expect(solo.kind).toBe("unchanged");
    expect(solo.desired).toMatchObject({ price_cents: 3900, stripe_price_id: "price_nov1", write_prices: false });
    expect(courseUpsertRow(solo.desired, mapping)).not.toHaveProperty("price_cents");
    expect(courseUpsertRow(solo.desired, mapping)).not.toHaveProperty("stripe_price_id");
    expect(formatDryRun(plan, { apply: true })).toContain("prices kept at 3900 eur / price_nov1");

    const store = memoryStore();
    await applyPlanWithStore(store, plan, mapping, { publish: false });
    for (const row of store.courseRows) {
      expect(row).not.toHaveProperty("price_cents");
      expect(row).not.toHaveProperty("stripe_price_id");
      expect(row).not.toHaveProperty("currency");
    }
  });

  it("gives a new row the mapping's launch price", () => {
    const plan = planImport({ manifest: boxManifest(), mapping, sourceRoot: simpleRoot(), env: SOLO_ENV });
    const solo = plan.courses.find((op) => op.key === "demo-core")!;
    expect(solo.kind).toBe("insert");
    expect(courseUpsertRow(solo.desired, mapping)).toMatchObject({
      price_cents: 2900,
      stripe_price_id: "price_test_solo_bundle",
      currency: "eur",
    });
  });

  it("moves Solo only when --set-prices names solo_bundle, and shows old -> new", async () => {
    const root = simpleRoot();
    const existing = switchedCatalog(root);
    const plan = planImport({
      manifest: boxManifest(),
      mapping,
      sourceRoot: root,
      existing,
      env: SOLO_ENV,
      setPrices: ["solo_bundle"],
      requireStripePriceIds: true,
    });
    expect(plan.errors).toEqual([]);
    const solo = plan.courses.find((op) => op.key === "demo-core")!;
    expect(solo.kind).toBe("update");
    const text = formatDryRun(plan, { compareLive: true });
    expect(text).toContain("price_cents 3900 -> 2900");
    expect(text).toContain("stripe_price_id price_nov1 -> price_test_solo_bundle");

    const store = memoryStore();
    await applyPlanWithStore(store, plan, mapping, { publish: false });
    expect(store.courseRows.find((row) => row.slug === "demo-core")).toMatchObject({
      price_cents: 2900,
      stripe_price_id: "price_test_solo_bundle",
    });
  });

  it("requires the Stripe env under --set-prices", () => {
    const root = simpleRoot();
    const plan = planImport({
      manifest: boxManifest(),
      mapping,
      sourceRoot: root,
      existing: switchedCatalog(root),
      env: {},
      setPrices: ["solo_bundle"],
      requireStripePriceIds: true,
    });
    expect(plan.errors.some((error) => /STRIPE_PRICE_ID_SOLO_BUNDLE is required/.test(error))).toBe(true);
  });
});

// Two catalog courses: demo-core exists, demo-extra is new.
function twoCourseManifest(): AcademyManifest {
  const manifest = boxManifest();
  manifest.courses.push({
    slug: "demo-extra",
    title: "Demo Extra",
    summary: "A course added after the Solo switch.",
    sort_order: 1,
    lessons: [{ slug: "intro", title: "Intro", source_md: "modules/extra.md", sort_order: 0, is_preview: true }],
    assets: [],
    extra_assets: [],
  });
  return manifest;
}

function twoCourseRoot(): string {
  const root = simpleRoot();
  writeTree(root, { "modules/extra.md": "Extra intro.\n" });
  return root;
}

// The live catalog after the 1 Nov switch: demo-core on Solo 3900 / price_nov1 and
// a Team 5 row at a live price that differs from the mapping.
function liveAfterSwitch(root: string) {
  const first = planImport({ manifest: boxManifest(), mapping, sourceRoot: root, env: SOLO_ENV });
  const rows = dbShapedCatalogFromPlan(first);
  for (const course of rows.courses) {
    if (course.product_code === "solo_bundle") Object.assign(course, { price_cents: 3900, stripe_price_id: "price_nov1" });
    if (course.product_code === "team_5") Object.assign(course, { price_cents: 30000, stripe_price_id: "price_live_team5" });
  }
  return rows;
}

describe("prices across product codes", () => {
  type Live = ReturnType<typeof liveAfterSwitch>;
  // Each test gets its own fresh rows, so mutating them cannot leak.
  const freshLive = (): Live => liveAfterSwitch(simpleRoot());
  const plan = (rows: Live = freshLive(), extra: Record<string, unknown> = {}) =>
    planImport({
      manifest: twoCourseManifest(),
      mapping,
      sourceRoot: twoCourseRoot(),
      existing: catalogSnapshotFromDbRows(rows),
      env: SOLO_ENV,
      requireStripePriceIds: true,
      ...extra,
    });
  const op = (p: ReturnType<typeof planImport>, slug: string) => p.courses.find((c) => c.key === slug)!;
  const solo = (rows: Live) => rows.courses.filter((course) => course.product_code === "solo_bundle");
  const MAPPED_SOLO = { price_cents: 2900, stripe_price_id: "price_test_solo_bundle", currency: "eur" };

  it("gives a Solo course added after the switch the live Solo price, not the launch price", async () => {
    const p = plan(freshLive(), { env: {} });
    expect(p.errors).toEqual([]);
    expect(op(p, "demo-extra").kind).toBe("insert");
    expect(op(p, "demo-extra").desired).toMatchObject({
      price_cents: 3900,
      stripe_price_id: "price_nov1",
      currency: "eur",
      inherited_prices: true,
    });
    expect(op(p, "demo-core").kind).toBe("unchanged");
    expect(formatDryRun(p, { compareLive: true })).toContain("inherited from existing solo_bundle rows");
    const store = memoryStore();
    await applyPlanWithStore(store, p, mapping, { publish: false });
    expect(store.courseRows.find((row) => row.slug === "demo-extra")).toMatchObject({
      price_cents: 3900,
      stripe_price_id: "price_nov1",
    });
  });

  it("refuses to add a Solo course when the existing Solo rows disagree", () => {
    const rows = freshLive();
    rows.courses.push({ ...solo(rows)[0], id: "other", slug: "legacy", price_cents: 2900 });
    const p = plan(rows);
    expect(p.errors.some((error) => /existing solo_bundle rows disagree on price_cents/.test(error))).toBe(true);
  });

  it("refuses to inherit a missing or malformed Stripe price id under --apply", () => {
    for (const bad of [null, "prod_1"]) {
      const rows = freshLive();
      for (const course of solo(rows)) course.stripe_price_id = bad;
      const p = plan(rows);
      expect(p.errors.some((error) => /no usable Stripe price id/.test(error))).toBe(true);
      // A dry-run without the apply requirement only reports what it would inherit.
      expect(plan(rows, { requireStripePriceIds: false }).errors).toEqual([]);
    }
  });

  it("refuses a bare --set-prices that would move Solo off a switched price", () => {
    const p = plan(freshLive(), { setPrices: true });
    expect(p.errors.some((error) => /refusing bare --set-prices: solo_bundle differs from the mapping on price_cents, stripe_price_id/.test(error))).toBe(true);
    expect(op(p, "demo-core").desired).toMatchObject({ price_cents: 3900, write_prices: false });
  });

  it.each([
    ["a hand-set price", { price_cents: 4900, stripe_price_id: "price_test_solo_bundle" }, "price_cents"],
    ["a different id at the launch price", { price_cents: 2900, stripe_price_id: "price_other" }, "stripe_price_id"],
    ["a different currency", { price_cents: 2900, stripe_price_id: "price_test_solo_bundle", currency: "usd" }, "currency"],
  ])("refuses a bare --set-prices over Solo with %s", (_name, fields, differing) => {
    const rows = freshLive();
    for (const course of solo(rows)) Object.assign(course, fields);
    const p = plan(rows, { setPrices: true });
    expect(p.errors.some((error) => error.includes(`differs from the mapping on ${differing}`))).toBe(true);
    expect(op(p, "demo-core").desired.write_prices).toBe(false);
  });

  it("lets a bare --set-prices run when Solo already equals the mapping, and moves the other rows", () => {
    const rows = freshLive();
    for (const course of solo(rows)) Object.assign(course, MAPPED_SOLO);
    const p = plan(rows, { setPrices: true });
    expect(p.errors).toEqual([]);
    expect(op(p, "demo-core").kind).toBe("unchanged");
    expect(op(p, "team-5").desired).toMatchObject({ price_cents: 34900, write_prices: true });
    expect(op(p, "demo-extra").desired).toMatchObject({ ...MAPPED_SOLO, inherited_prices: false });
  });

  it("moves only team_5 with --set-prices=team_5", () => {
    const p = plan(freshLive(), { setPrices: ["team_5"] });
    expect(p.errors).toEqual([]);
    expect(op(p, "team-5").kind).toBe("update");
    expect(op(p, "team-5").desired).toMatchObject({ price_cents: 34900, stripe_price_id: "price_test_team_5" });
    expect(op(p, "demo-core").desired).toMatchObject({ price_cents: 3900, stripe_price_id: "price_nov1", write_prices: false });
    expect(op(p, "demo-extra").desired).toMatchObject({ price_cents: 3900, inherited_prices: true });
    const text = formatDryRun(p, { compareLive: true });
    expect(text).toContain("price_cents 30000 -> 34900");
    expect(text).toContain("stripe_price_id price_live_team5 -> price_test_team_5");
    expect(text).toContain("prices kept at 3900 eur / price_nov1");
  });

  it("moves Solo with --set-prices=solo_bundle, shows old -> new, and prices a new Solo course the same", () => {
    const p = plan(freshLive(), { setPrices: ["solo_bundle"] });
    expect(p.errors).toEqual([]);
    expect(op(p, "demo-core").desired).toMatchObject(MAPPED_SOLO);
    expect(op(p, "demo-extra").desired).toMatchObject({ ...MAPPED_SOLO, inherited_prices: false });
    expect(op(p, "team-5").desired).toMatchObject({ price_cents: 30000, write_prices: false });
    const text = formatDryRun(p, { compareLive: true });
    expect(text).toContain("price_cents 3900 -> 2900");
    expect(text).toContain("stripe_price_id price_nov1 -> price_test_solo_bundle");
  });

  it("needs the live catalog and a known product code for --set-prices", () => {
    const noLive = planImport({ manifest: boxManifest(), mapping, sourceRoot: simpleRoot(), env: SOLO_ENV, setPrices: true });
    expect(noLive.errors.some((error) => /needs the live catalog/.test(error))).toBe(true);
    const unknown = plan(freshLive(), { setPrices: ["team_7"] });
    expect(unknown.errors.some((error) => /unknown product code team_7/.test(error))).toBe(true);
  });

  it("uses the mapping when no row of the product code exists yet", () => {
    const p = planImport({ manifest: twoCourseManifest(), mapping, sourceRoot: twoCourseRoot(), env: SOLO_ENV });
    expect(op(p, "demo-extra").desired).toMatchObject({ price_cents: 2900, inherited_prices: false });
  });

  it("tells a plain dry-run that the prices shown are for new rows", () => {
    const p = planImport({ manifest: boxManifest(), mapping, sourceRoot: simpleRoot(), env: SOLO_ENV });
    expect(formatDryRun(p)).toContain("prices shown are for new rows; existing rows keep theirs unless named in --set-prices");
  });
});

describe("price switch", () => {
  function fakeStore(rows: { slug: string; price_cents: number | null; stripe_price_id: string | null }[]) {
    const writes: { code: string; cents: number; id: string }[] = [];
    let opened = 0;
    const store: PriceSwitchStore = {
      async listByProductCode() {
        return rows;
      },
      async setPrices(code, cents, id) {
        writes.push({ code, cents, id });
      },
    };
    return { writes, opened: () => opened, openStore: () => ((opened += 1), store) };
  }
  const solo = [
    { slug: "a", price_cents: 2900, stripe_price_id: "price_test_solo_bundle" },
    { slug: "b", price_cents: 2900, stripe_price_id: "price_test_solo_bundle" },
  ];

  it("is a dry-run by default: no store is opened and nothing is written", async () => {
    const fake = fakeStore(solo);
    const lines: string[] = [];
    const result = await runPriceSwitch({
      mapping,
      stripePriceId: "price_nov1",
      apply: false,
      openStore: fake.openStore,
      log: (line) => lines.push(line),
    });
    expect(result.updated).toBe(0);
    expect(fake.opened()).toBe(0);
    expect(fake.writes).toEqual([]);
    expect(lines.join("\n")).toContain("Dry-run: no writes");
  });

  it("with --apply updates only the catalog SKU, with the trimmed validated id", async () => {
    const fake = fakeStore(solo);
    const result = await runPriceSwitch({
      mapping,
      stripePriceId: "  price_nov1  ",
      apply: true,
      openStore: fake.openStore,
      log: () => undefined,
    });
    expect(result).toEqual({ stripePriceId: "price_nov1", updated: 2 });
    expect(fake.writes).toEqual([{ code: "solo_bundle", cents: 3900, id: "price_nov1" }]);
  });

  it("writes nothing when the rows are already at the target", async () => {
    const fake = fakeStore(solo.map((row) => ({ ...row, price_cents: 3900, stripe_price_id: "price_nov1" })));
    const result = await runPriceSwitch({
      mapping,
      stripePriceId: "price_nov1",
      apply: true,
      openStore: fake.openStore,
      log: () => undefined,
    });
    expect(result.updated).toBe(0);
    expect(fake.writes).toEqual([]);
  });

  it("refuses a malformed id before opening the store", async () => {
    const fake = fakeStore(solo);
    await expect(
      runPriceSwitch({ mapping, stripePriceId: "prod_1", apply: true, openStore: fake.openStore, log: () => undefined }),
    ).rejects.toThrow(/must match/);
    expect(fake.opened()).toBe(0);
  });
});

describe("course.json lessons are validated", () => {
  const withLessons = (lessons: unknown[]) => {
    const root = tmpDir();
    writeTree(root, {
      "content/courses/demo-core/course.json": JSON.stringify({ slug: "demo-core", title: "Demo Core", lessons }),
      "content/courses/demo-core/00-a.md": welcomeBody,
      "content/courses/demo-core/01-b.md": paidBody,
    });
    return planImport({ manifest: boxManifest(), mapping, sourceRoot: root });
  };

  it("refuses duplicate slugs, over-long slugs and a broken sort_order", () => {
    const plan = withLessons([
      { slug: "a", title: "A", sort_order: 0, is_preview: true, body_md_file: "00-a.md" },
      { slug: "a", title: "A again", sort_order: 5, body_md_file: "01-b.md" },
      { slug: "x".repeat(121), title: "Long", sort_order: 2 },
    ]);
    expect(plan.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("duplicate lesson slug a"),
        expect.stringContaining("lessons[2].slug is required"),
        expect.stringContaining("sort_order must be 0..n-1"),
      ]),
    );
    expect(plan.lessons).toEqual([]);
  });

  it("still requires a preview lesson", () => {
    const plan = withLessons([{ slug: "a", title: "A", sort_order: 0, body_md_file: "00-a.md" }]);
    expect(plan.errors.some((error) => /is_preview true/.test(error))).toBe(true);
  });

  it("accepts a well-formed course.json", () => {
    const plan = withLessons([
      { slug: "a", title: "A", sort_order: 0, is_preview: true, body_md_file: "00-a.md" },
      { slug: "paid", title: "B", sort_order: 1, body_md_file: "01-b.md" },
    ]);
    expect(plan.errors).toEqual([]);
    expect(plan.lessons).toHaveLength(2);
  });
});

describe("upload content types", () => {
  it("derives the type from the extension", () => {
    expect(contentTypeFor("kits/x/kit.zip")).toBe("application/zip");
    expect(contentTypeFor("extras/guide.PDF")).toBe("application/pdf");
    expect(contentTypeFor("extras/notes.txt")).toBe("text/plain; charset=utf-8");
    expect(contentTypeFor("extras/notes.md")).toBe("text/markdown; charset=utf-8");
    expect(contentTypeFor("extras/blob")).toBe("application/octet-stream");
    expect(contentTypeFor("extras/blob.xyz")).toBe("application/octet-stream");
  });

  it("uploads a text extra asset as text/plain, not application/zip", async () => {
    const fixtures = path.resolve("scripts/fixtures/academy");
    const handout = readFileSync(path.join(fixtures, "extra-handout.txt"));
    const digest = digestBytes(handout);
    const manifest = boxManifest();
    manifest.courses[0].extra_assets = [
      {
        label: "Handout",
        file: "extra-handout.txt",
        sha256: digest.sha256,
        size_bytes: digest.sizeBytes,
        storage_path: "extras/demo-core/extra-handout.txt",
      },
    ];
    const plan = planImport({ manifest, mapping, sourceRoot: simpleRoot(), assetsDirs: [fixtures], env: SOLO_ENV });
    expect(plan.errors).toEqual([]);
    const store = memoryStore();
    await applyPlanWithStore(store, plan, mapping, { publish: false });
    expect(store.contentTypes).toEqual({ "extras/demo-core/extra-handout.txt": "text/plain; charset=utf-8" });
  });
});

describe("rows the plan does not cover", () => {
  it("warns about database lessons and assets missing from the plan and never deletes", async () => {
    const root = simpleRoot();
    const rows = dbShapedCatalogFromPlan(
      planImport({ manifest: boxManifest(), mapping, sourceRoot: root, env: SOLO_ENV }),
    );
    const courseId = String(rows.courses.find((course) => course.slug === "demo-core")!.id);
    rows.lessons.push({ id: "l-old", course_id: courseId, slug: "retired", title: "Retired", sort_order: 9, body_md: "x" });
    rows.assets.push({
      id: "a-old",
      course_id: courseId,
      lesson_id: null,
      label: "Old kit",
      storage_path: "kits/old/kit.zip",
      sha256: "0".repeat(64),
      size_bytes: 1,
    });
    const plan = planImport({
      manifest: boxManifest(),
      mapping,
      sourceRoot: root,
      existing: catalogSnapshotFromDbRows(rows),
      env: SOLO_ENV,
    });
    expect(plan.errors).toEqual([]);
    expect(plan.warnings).toEqual([
      expect.stringContaining("demo-core/retired: lesson is in the database but not in the plan"),
      expect.stringContaining("demo-core: asset kits/old/kit.zip is in the database but not in the plan"),
    ]);
    expect(formatDryRun(plan, { compareLive: true })).toContain("never deletes");
    const store = memoryStore();
    await applyPlanWithStore(store, plan, mapping, { publish: false });
    expect(store.calls.some((call) => /delete|retired/.test(call))).toBe(false);
  });

  it("stays quiet without a database read or when everything is covered", () => {
    const root = simpleRoot();
    expect(planImport({ manifest: boxManifest(), mapping, sourceRoot: root }).warnings).toEqual([]);
    expect(
      planImport({ manifest: boxManifest(), mapping, sourceRoot: root, existing: switchedCatalog(root) }).warnings,
    ).toEqual([]);
  });
});

describe("publish reporting", () => {
  it("says Publish: no unless --publish is passed, and plans no publish", () => {
    const plan = planImport({ manifest: boxManifest(), mapping, sourceRoot: simpleRoot(), env: SOLO_ENV });
    expect(plan.publish).toBe(false);
    expect(formatDryRun(plan, { apply: true })).toContain("Publish: no.");
    const publishing = planImport({ manifest: boxManifest(), mapping, sourceRoot: simpleRoot(), env: SOLO_ENV, publish: true });
    expect(formatDryRun(publishing, { apply: true, publish: true })).toContain("Publish: yes");
  });
});
