#!/usr/bin/env npx tsx
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  ACADEMY_KITS_BUCKET,
  HELP,
  applyPlanWithStore,
  catalogSnapshotFromDbRows,
  formatDryRun,
  parseArgs,
  planHasChanges,
  planImport,
  runPriceSwitch,
  validateManifest,
  validateProductMapping,
  type AcademyManifest,
  type AcademyWriteStore,
  type PriceSwitchStore,
  type ProductMapping,
} from "./academy-import-lib";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadJson(file: string): unknown {
  return JSON.parse(readFileSync(file, "utf8"));
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required in the environment and must not be committed.`);
  }
  return value;
}

function readServiceRole(): { url: string; key: string } {
  return {
    url: requireEnv("SUPABASE_URL"),
    key: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

function supabaseStore(supabase: SupabaseClient): AcademyWriteStore {
  return {
    async upsertCourse(row) {
      const { data, error } = await supabase
        .from("academy_courses")
        .upsert(row, { onConflict: "slug" })
        .select("id, slug")
        .single();
      if (error) throw new Error(`course ${String(row.slug)}: ${error.message}`);
      return data;
    },
    async listCourses() {
      const { data, error } = await supabase.from("academy_courses").select("id, slug");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    async upsertLesson(row) {
      const { data, error } = await supabase
        .from("academy_lessons")
        .upsert(row, { onConflict: "course_id,slug" })
        .select("id, slug, course_id")
        .single();
      if (error) throw new Error(`lesson ${String(row.slug)}: ${error.message}`);
      return data;
    },
    async listLessons() {
      const { data, error } = await supabase.from("academy_lessons").select("id, slug, course_id");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    async uploadAsset(storagePath, bytes, contentType) {
      const { error } = await supabase.storage.from(ACADEMY_KITS_BUCKET).upload(storagePath, bytes, {
        upsert: true,
        contentType,
      });
      if (error) throw new Error(`upload ${storagePath}: ${error.message}`);
    },
    async upsertAsset(row) {
      const { error } = await supabase.from("academy_assets").upsert(row, { onConflict: "storage_path" });
      if (error) throw new Error(`asset ${String(row.storage_path)}: ${error.message}`);
    },
    async publishCatalog(slugs) {
      const { error } = await supabase.from("academy_courses").update({ is_published: true }).in("slug", slugs);
      if (error) throw new Error(`publish: ${error.message}`);
    },
  };
}

async function fetchSnapshot(supabase: SupabaseClient) {
  const coursesRes = await supabase.from("academy_courses").select("*");
  const lessonsRes = await supabase.from("academy_lessons").select("*");
  const assetsRes = await supabase.from("academy_assets").select("*");
  if (coursesRes.error) throw new Error(coursesRes.error.message);
  if (lessonsRes.error) throw new Error(lessonsRes.error.message);
  if (assetsRes.error) throw new Error(assetsRes.error.message);
  return catalogSnapshotFromDbRows({
    courses: coursesRes.data ?? [],
    lessons: lessonsRes.data ?? [],
    assets: assetsRes.data ?? [],
  });
}

function supabasePriceSwitchStore(supabase: SupabaseClient): PriceSwitchStore {
  return {
    async listByProductCode(productCode) {
      const { data, error } = await supabase
        .from("academy_courses")
        .select("slug, price_cents, stripe_price_id")
        .eq("product_code", productCode);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    async setPrices(productCode, priceCents, stripePriceId) {
      const { error } = await supabase
        .from("academy_courses")
        .update({ price_cents: priceCents, stripe_price_id: stripePriceId })
        .eq("product_code", productCode);
      if (error) throw new Error(error.message);
    },
  };
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return 0;
  }
  if (args.priceSwitch) {
    if (!args.stripePriceId) {
      console.error("--price-switch requires --stripe-price-id");
      return 1;
    }
    const mappingPath = path.join(ROOT, "academy/product-mapping.json");
    const mappingResult = validateProductMapping(loadJson(mappingPath));
    if (!mappingResult.ok || !mappingResult.mapping) {
      throw new Error(mappingResult.errors.join("\n"));
    }
    await runPriceSwitch({
      mapping: mappingResult.mapping,
      stripePriceId: args.stripePriceId,
      apply: args.apply,
      openStore: () => {
        const { url, key } = readServiceRole();
        return supabasePriceSwitchStore(createClient(url, key));
      },
    });
    return 0;
  }
  if (!args.manifest || !args.sourceRoot) {
    console.error(HELP);
    return 1;
  }

  const manifestPath = path.resolve(args.manifest);
  const sourceRoot = path.resolve(args.sourceRoot);
  const mappingPath = path.resolve(args.productMapping ?? path.join(ROOT, "academy/product-mapping.json"));
  const assetsDirs = args.assetsDir.map((dir) => path.resolve(dir));

  const manifestResult = validateManifest(loadJson(manifestPath));
  if (!manifestResult.ok || !manifestResult.manifest) {
    console.error("Manifest validation failed:");
    for (const error of manifestResult.errors) console.error(`  ${error}`);
    return 1;
  }
  const mappingResult = validateProductMapping(loadJson(mappingPath));
  if (!mappingResult.ok || !mappingResult.mapping) {
    console.error("Product mapping validation failed:");
    for (const error of mappingResult.errors) console.error(`  ${error}`);
    return 1;
  }

  let existing = undefined;
  let supabase: SupabaseClient | null = null;
  if (args.apply || args.compareLive) {
    const { url, key } = readServiceRole();
    supabase = createClient(url, key);
    existing = await fetchSnapshot(supabase);
  }

  const plan = planImport({
    manifest: manifestResult.manifest as AcademyManifest,
    mapping: mappingResult.mapping as ProductMapping,
    sourceRoot,
    assetsDirs,
    existing,
    sourceCommit: args.sourceCommit,
    publish: args.publish,
    setPrices: args.setPrices,
    requireStripePriceIds: args.apply || args.setPrices !== false,
  });
  console.log(formatDryRun(plan, { apply: args.apply, publish: args.publish, compareLive: args.compareLive }));
  if (plan.errors.length) return 1;
  if (!args.apply) return 0;

  if (!supabase) {
    console.error("Internal error: --apply did not open a client.");
    return 1;
  }
  await applyPlanWithStore(supabaseStore(supabase), plan, mappingResult.mapping, { publish: args.publish });
  console.log(
    planHasChanges(plan) || args.publish
      ? args.publish
        ? "Import applied. Catalog courses published last."
        : "Import applied."
      : "Import applied (no row or object changes; rerun is a no-op).",
  );
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
