import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  STALE_COMPLETE_ZIP_PREFIX,
  applyExactRewrites,
  digestBytes,
  formatDryRun,
  planImport,
  productCodesForCourse,
  snapshotFromPlan,
  stripLeadingH1,
  validateManifest,
  validateProductMapping,
  verifyChecksum,
  type AcademyManifest,
  type ProductMapping,
} from "./academy-import-lib";

const mapping: ProductMapping = {
  catalogSku: "solo_bundle",
  currency: "eur",
  launchPriceCents: 2900,
  postLaunchPriceCents: 3900,
  publishCatalogCourses: true,
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
    excluded_asset_sha256_prefixes: [STALE_COMPLETE_ZIP_PREFIX],
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

describe("manifest validation", () => {
  it("accepts a catalog course with extra_assets", () => {
    const extra = {
      label: "Extra handout",
      file: "/tmp/handout.zip",
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
    const extraPath = path.join(root, "outside", "handout.zip");
    writeTree(root, {
      "kits/kit.zip": kit,
      "outside/handout.zip": extra,
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
        file: extraPath,
        sha256: extraDigest.sha256,
        size_bytes: extraDigest.sizeBytes,
        storage_path: "extras/demo-core/handout.zip",
      },
    ];

    const first = planImport({ manifest, mapping, sourceRoot: root });
    expect(first.errors).toEqual([]);
    expect(first.layout.kind).toBe("box");
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

    const second = planImport({
      manifest,
      mapping,
      sourceRoot: root,
      existing: snapshotFromPlan(first),
    });
    expect(second.errors).toEqual([]);
    expect(second.courses.every((op) => op.kind === "unchanged")).toBe(true);
    expect(second.lessons.every((op) => op.kind === "unchanged")).toBe(true);
    expect(second.assets.filter((op) => !op.desired.skip).every((op) => op.kind === "unchanged")).toBe(true);
    expect(formatDryRun(second)).toMatch(/no-op/);
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
