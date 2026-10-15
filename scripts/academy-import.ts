#!/usr/bin/env npx tsx
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  ACADEMY_KITS_BUCKET,
  HELP,
  formatDryRun,
  parseArgs,
  planImport,
  planHasChanges,
  validateManifest,
  validateProductMapping,
  verifyChecksum,
  type AcademyManifest,
  type ImportPlan,
  type PlannedCourse,
  type ProductMapping,
} from "./academy-import-lib.ts";

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

function courseRow(course: PlannedCourse, mapping: ProductMapping): Record<string, unknown> {
  const row: Record<string, unknown> = {
    slug: course.slug,
    title: course.title,
    summary: course.summary,
    sort_order: course.sort_order,
    is_published: course.is_published,
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

async function fetchSnapshot(supabase: SupabaseClient) {
  const coursesRes = await supabase.from("academy_courses").select("*");
  const lessonsRes = await supabase.from("academy_lessons").select("*");
  const assetsRes = await supabase.from("academy_assets").select("*");
  if (coursesRes.error) throw new Error(coursesRes.error.message);
  if (lessonsRes.error) throw new Error(lessonsRes.error.message);
  if (assetsRes.error) throw new Error(assetsRes.error.message);

  const courses: Record<string, Record<string, unknown>> = {};
  for (const row of coursesRes.data ?? []) courses[row.slug] = row;

  const lessons: Record<string, Record<string, unknown>> = {};
  const courseIdToSlug = new Map<string, string>();
  for (const row of coursesRes.data ?? []) courseIdToSlug.set(row.id, row.slug);
  for (const row of lessonsRes.data ?? []) {
    const courseSlug = courseIdToSlug.get(row.course_id);
    if (!courseSlug) continue;
    lessons[`${courseSlug}/${row.slug}`] = row;
  }

  const assets: Record<string, Record<string, unknown>> = {};
  for (const row of assetsRes.data ?? []) assets[row.storage_path] = row;

  return { courses, lessons, assets };
}

async function applyPlan(
  supabase: SupabaseClient,
  plan: ImportPlan,
  mapping: ProductMapping,
): Promise<void> {
  const courseIds = new Map<string, string>();
  const lessonIds = new Map<string, string>();

  for (const op of plan.courses) {
    if (op.kind !== "insert" && op.kind !== "update") continue;
    const { data, error } = await supabase
      .from("academy_courses")
      .upsert(courseRow(op.desired, mapping), { onConflict: "slug" })
      .select("id, slug")
      .single();
    if (error) throw new Error(`course ${op.desired.slug}: ${error.message}`);
    courseIds.set(data.slug, data.id);
  }

  const { data: allCourses, error: listErr } = await supabase.from("academy_courses").select("id, slug");
  if (listErr) throw new Error(listErr.message);
  for (const row of allCourses ?? []) courseIds.set(row.slug, row.id);

  for (const op of plan.lessons) {
    if (op.kind !== "insert" && op.kind !== "update") continue;
    const courseId = courseIds.get(op.desired.course_slug);
    if (!courseId) throw new Error(`lesson ${op.key}: missing course id`);
    const { data, error } = await supabase
      .from("academy_lessons")
      .upsert(
        {
          course_id: courseId,
          slug: op.desired.slug,
          title: op.desired.title,
          sort_order: op.desired.sort_order,
          body_md: op.desired.body_md,
          is_preview: op.desired.is_preview,
          duration_minutes: op.desired.duration_minutes,
        },
        { onConflict: "course_id,slug" },
      )
      .select("id, slug, course_id")
      .single();
    if (error) throw new Error(`lesson ${op.key}: ${error.message}`);
    lessonIds.set(op.key, data.id);
  }

  const { data: allLessons, error: lessonErr } = await supabase
    .from("academy_lessons")
    .select("id, slug, course_id");
  if (lessonErr) throw new Error(lessonErr.message);
  const idToSlug = new Map([...courseIds.entries()].map(([slug, id]) => [id, slug]));
  for (const row of allLessons ?? []) {
    const courseSlug = idToSlug.get(row.course_id);
    if (courseSlug) lessonIds.set(`${courseSlug}/${row.slug}`, row.id);
  }

  for (const op of plan.assets) {
    if (op.kind === "skip" || op.kind === "refuse" || op.kind === "unchanged") continue;
    const asset = op.desired;
    if (!asset.local_path) throw new Error(`asset ${asset.storage_path}: missing local file`);
    const bytes = readFileSync(asset.local_path);
    verifyChecksum(bytes, asset.sha256, asset.size_bytes, asset.storage_path);

    const { error: uploadError } = await supabase.storage
      .from(ACADEMY_KITS_BUCKET)
      .upload(asset.storage_path, bytes, {
        upsert: true,
        contentType: "application/zip",
      });
    if (uploadError) throw new Error(`upload ${asset.storage_path}: ${uploadError.message}`);

    const courseId = courseIds.get(asset.course_slug);
    if (!courseId) throw new Error(`asset ${asset.storage_path}: missing course id`);
    const lessonId = asset.lesson_slug ? lessonIds.get(`${asset.course_slug}/${asset.lesson_slug}`) ?? null : null;

    const { error } = await supabase.from("academy_assets").upsert(
      {
        course_id: courseId,
        lesson_id: lessonId,
        label: asset.label,
        storage_path: asset.storage_path,
        sha256: asset.sha256,
        size_bytes: asset.size_bytes,
      },
      { onConflict: "storage_path" },
    );
    if (error) throw new Error(`asset ${asset.storage_path}: ${error.message}`);
  }
}

async function priceSwitch(dryRun: boolean, stripePriceId: string): Promise<void> {
  const mappingPath = path.join(ROOT, "academy/product-mapping.json");
  const mappingResult = validateProductMapping(loadJson(mappingPath));
  if (!mappingResult.ok || !mappingResult.mapping) {
    throw new Error(mappingResult.errors.join("\n"));
  }
  const mapping = mappingResult.mapping;
  const url = requireEnv("SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("academy_courses")
    .select("id, slug, product_code, price_cents, stripe_price_id")
    .eq("product_code", mapping.catalogSku);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const changing = rows.filter(
    (row) => row.price_cents !== mapping.postLaunchPriceCents || row.stripe_price_id !== stripePriceId,
  );
  console.log(
    `Solo Bundle 1 Nov switch: ${changing.length} of ${rows.length} ${mapping.catalogSku} row(s) would move to ${mapping.postLaunchPriceCents} ${mapping.currency} / ${stripePriceId}`,
  );
  for (const row of changing) {
    console.log(`  ${row.slug}: ${row.price_cents} / ${row.stripe_price_id} -> ${mapping.postLaunchPriceCents} / ${stripePriceId}`);
  }
  if (dryRun || changing.length === 0) {
    console.log(dryRun ? "Dry-run: no writes." : "Already at target: no writes.");
    return;
  }
  const { error: updateError } = await supabase
    .from("academy_courses")
    .update({
      price_cents: mapping.postLaunchPriceCents,
      stripe_price_id: stripePriceId,
    })
    .eq("product_code", mapping.catalogSku);
  if (updateError) throw new Error(updateError.message);
  console.log("Updated.");
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
    await priceSwitch(args.dryRun, args.stripePriceId);
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

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let existing = undefined;
  if (url && key) {
    const supabase = createClient(url, key);
    existing = await fetchSnapshot(supabase);
  } else if (!args.dryRun) {
    console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required unless --dry-run.");
    return 1;
  }

  const plan = planImport({
    manifest: manifestResult.manifest as AcademyManifest,
    mapping: mappingResult.mapping as ProductMapping,
    sourceRoot,
    assetsDirs,
    existing,
    sourceCommit: args.sourceCommit,
  });
  console.log(formatDryRun(plan));
  if (plan.errors.length) return 1;
  if (args.dryRun) return 0;

  const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
  await applyPlan(supabase, plan, mappingResult.mapping);
  console.log(
    planHasChanges(plan)
      ? "Import applied."
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
