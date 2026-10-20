import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  STALE_COMPLETE_ZIP_PREFIX,
  SUPERSEDED_COMPLETE_ZIP_PREFIX,
  STRIPE_PRICE_ID_RE,
  applyExactRewrites,
  applyPlanWithStore,
  assetsNeedingUpload,
  assertStripePriceId,
  catalogSnapshotFromDbRows,
  catalogSlugsToPublish,
  courseUpsertRow,
  dbShapedCatalogFromPlan,
  digestBytes,
  formatDryRun,
  parseArgs,
  planImport,
  productCodesForCourse,
  stripLeadingH1,
  validateManifest,
  validateProductMapping,
  verifyChecksum,
  type AcademyManifest,
  type AcademyWriteStore,
  type ProductMapping,
} from "./academy-import-lib";

const mapping: ProductMapping = {
  catalogSku: "solo_bundle",
  currency: "eur",
  launchPriceCents: 2900,
  postLaunchPriceCents: 3900,
  publishCatalogCourses: false,
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

function tmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "academy-import-"));
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
} {
  const calls: string[] = [];
  const uploads: string[] = [];
  const courses = [...(seed?.courses ?? [])];
  return {
    calls,
    uploads,
    async upsertCourse(row) {
      calls.push(`course:${String(row.slug)}`);
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
    async uploadAsset(storagePath) {
      calls.push(`upload:${storagePath}`);
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
    expect(result.mapping?.publishCatalogCourses).toBe(false);
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
