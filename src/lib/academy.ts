import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const ACADEMY_PATH = "/academy";
export const ACADEMY_KITS_BUCKET = "academy-kits";
export const ACADEMY_KIT_SIGNED_URL_TTL_SECONDS = 600;

export const ACADEMY_COURSE_COLUMNS =
  "id, slug, title, summary, sort_order, is_published, price_cents, currency, stripe_price_id, product_code";

export const ACADEMY_LESSON_LIST_COLUMNS = "id, course_id, slug, title, sort_order, is_preview";

export const ACADEMY_ASSET_COLUMNS = "id, course_id, lesson_id, label, storage_path";

export type Course = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  sort_order: number;
  is_published: boolean;
  price_cents: number;
  currency: string;
  stripe_price_id: string | null;
  product_code: string | null;
};

export type LessonSummary = {
  id: string;
  course_id: string;
  slug: string;
  title: string;
  sort_order: number;
  is_preview: boolean;
};

export type Lesson = LessonSummary & {
  body_md: string | null;
};

export type Entitlement = {
  id: string;
  course_id: string;
  subject_type: "user" | "org";
  user_id: string | null;
  organization_id: string | null;
  seats: number;
  source: "stripe" | "gumroad_migration" | "manual";
  stripe_checkout_session_id: string | null;
  granted_at: string;
  revoked_at: string | null;
};

export type AcademyAsset = {
  id: string;
  course_id: string;
  lesson_id: string | null;
  label: string;
  storage_path: string;
};

export type LessonPageMeta = {
  course: Course;
  lesson: LessonSummary;
};

type AcademyClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string | boolean) => AcademyFilter;
      order: (column: string, options: { ascending: boolean }) => Promise<AcademyResult<unknown>>;
    };
  };
  rpc: (
    fn: string,
    args: { p_course_id: string },
  ) => Promise<AcademyResult<unknown>>;
};

type AcademyFilter = {
  eq: (column: string, value: string | boolean) => AcademyFilter;
  is: (column: string, value: null) => AcademyFilter;
  order: (column: string, options: { ascending: boolean }) => AcademyFilter;
  maybeSingle: () => Promise<AcademyResult<unknown>>;
  then: Promise<AcademyResult<unknown>>["then"];
};

type AcademyResult<T> = {
  data: T | null;
  error: { code?: string; message?: string } | null;
};

const academyClient = supabase as unknown as AcademyClient;

export function coursePath(courseSlug: string): string {
  return `${ACADEMY_PATH}/${courseSlug}`;
}

export function lessonPath(courseSlug: string, lessonSlug: string): string {
  return `${ACADEMY_PATH}/${courseSlug}/${lessonSlug}`;
}

export function formatAcademyPrice(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

export function canReadLessonBody(
  lesson: Pick<LessonSummary, "is_preview">,
  hasAccess: boolean,
): boolean {
  return lesson.is_preview || hasAccess;
}

export function isMissingAcademyRelation(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.code === "PGRST202" ||
    error.code === "42P01" ||
    error.code === "42883"
  );
}

export const ACADEMY_SOLO_PRODUCT_CODE = "solo_bundle";
export const ACADEMY_SOLO_BUNDLE_ID = "solo-bundle";
export const ACADEMY_SOLO_BUNDLE_HASH = `#${ACADEMY_SOLO_BUNDLE_ID}`;

/** Placeholder. Issue #42 will point this at the Gumroad Team URL. */
export const ACADEMY_TEAM_LICENCES_URL = "/elsa-plus/training";

export function scrollAcademySoloBundleIntoView(
  hash: string,
  findElement: (id: string) => { scrollIntoView: () => void } | null = (id) =>
    typeof document === "undefined" ? null : document.getElementById(id),
): boolean {
  if (hash !== ACADEMY_SOLO_BUNDLE_HASH) return false;
  const target = findElement(ACADEMY_SOLO_BUNDLE_ID);
  if (!target) return false;
  target.scrollIntoView();
  return true;
}

/**
 * Fields Stripe checkout will need. Always the Solo Bundle.
 * #54 accepts { productCode } or { courseId }, never both, and 400s if
 * Solo sends organizationId.
 */
export function academyCheckoutFields() {
  return {
    productCode: ACADEMY_SOLO_PRODUCT_CODE,
  };
}

/**
 * Placeholder until Stripe checkout lands. Always buys the Solo Bundle.
 */
export function handleBuyCourse(): void {
  academyCheckoutFields();
  toast.message("Checkout is coming soon", {
    description: "Stripe checkout for the Solo Bundle will land in a follow-up.",
  });
}

type AcademyStubModule = typeof import("./academyStub");

async function loadAcademyStub(): Promise<AcademyStubModule | null> {
  if (import.meta.env.DEV === true || (import.meta.env.PROD !== true && import.meta.env.VITE_ACADEMY_STUB === "1")) {
    return import("./academyStub");
  }
  return null;
}

async function onMissingAcademyRelation<T>(
  error: { code?: string; message?: string },
  readStub: (stub: AcademyStubModule) => T,
  emptyValue: T,
): Promise<T> {
  if (!isMissingAcademyRelation(error)) throw error;
  const stub = await loadAcademyStub();
  return stub ? readStub(stub) : emptyValue;
}

export async function listPublishedCourses(): Promise<Course[]> {
  const { data, error } = await academyClient
    .from("academy_courses")
    .select(ACADEMY_COURSE_COLUMNS)
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return onMissingAcademyRelation(error, (stub) => stub.ACADEMY_STUB_COURSES, []);
  }

  return (data ?? []) as Course[];
}

export async function getPublishedCourseBySlug(slug: string): Promise<Course | null> {
  const { data, error } = await academyClient
    .from("academy_courses")
    .select(ACADEMY_COURSE_COLUMNS)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    return onMissingAcademyRelation(
      error,
      (stub) => stub.ACADEMY_STUB_COURSES.find((course) => course.slug === slug) ?? null,
      null,
    );
  }

  return (data as Course | null) ?? null;
}

export async function listCourseLessons(courseId: string): Promise<LessonSummary[]> {
  const { data, error } = await academyClient.rpc("academy_course_outline", {
    p_course_id: courseId,
  });

  if (error) {
    return onMissingAcademyRelation(
      error,
      (stub) => stub.ACADEMY_STUB_LESSONS.filter((lesson) => lesson.course_id === courseId),
      [],
    );
  }

  return ((data ?? []) as Omit<LessonSummary, "course_id">[]).map((row) => ({
    ...row,
    course_id: courseId,
  }));
}

export async function getLessonPageMeta(
  courseSlug: string,
  lessonSlug: string,
): Promise<LessonPageMeta | null> {
  const course = await getPublishedCourseBySlug(courseSlug);
  if (!course) return null;

  const lessons = await listCourseLessons(course.id);
  const lesson = lessons.find((row) => row.slug === lessonSlug);
  if (!lesson) return null;
  return { course, lesson };
}

export async function fetchLessonBody(lessonId: string): Promise<string | null> {
  const { data, error } = await academyClient
    .from("academy_lessons")
    .select("body_md")
    .eq("id", lessonId)
    .maybeSingle();

  if (error) {
    return onMissingAcademyRelation(
      error,
      (stub) => stub.ACADEMY_STUB_LESSON_BODIES[lessonId] ?? null,
      null,
    );
  }

  const row = data as { body_md: string | null } | null;
  return row?.body_md ?? null;
}

export async function hasAcademyAccess(courseId: string): Promise<boolean> {
  const { data, error } = await academyClient.rpc("has_academy_access", {
    p_course_id: courseId,
  });

  if (error) {
    if (isMissingAcademyRelation(error)) return false;
    throw error;
  }

  return data === true;
}

export async function mapCourseAccess(courseIds: string[]): Promise<Record<string, boolean>> {
  const uniqueIds = [...new Set(courseIds)];
  const entries = await Promise.all(
    uniqueIds.map(async (id) => [id, await hasAcademyAccess(id)] as const),
  );
  return Object.fromEntries(entries);
}

export async function listCourseKitAssets(courseId: string): Promise<AcademyAsset[]> {
  const { data, error } = await academyClient
    .from("academy_assets")
    .select(ACADEMY_ASSET_COLUMNS)
    .eq("course_id", courseId)
    .is("lesson_id", null)
    .order("label", { ascending: true });

  if (error) {
    return onMissingAcademyRelation(
      error,
      (stub) => stub.ACADEMY_STUB_ASSETS.filter((asset) => asset.course_id === courseId && asset.lesson_id === null),
      [],
    );
  }

  return (data ?? []) as AcademyAsset[];
}

export async function listLessonAssets(
  courseId: string,
  lessonId: string,
): Promise<AcademyAsset[]> {
  const { data, error } = await academyClient
    .from("academy_assets")
    .select(ACADEMY_ASSET_COLUMNS)
    .eq("course_id", courseId)
    .eq("lesson_id", lessonId)
    .order("label", { ascending: true });

  if (error) {
    return onMissingAcademyRelation(
      error,
      (stub) => stub.ACADEMY_STUB_ASSETS.filter((asset) => asset.course_id === courseId && asset.lesson_id === lessonId),
      [],
    );
  }

  return (data ?? []) as AcademyAsset[];
}

export async function createAcademyKitSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(ACADEMY_KITS_BUCKET)
    .createSignedUrl(storagePath, ACADEMY_KIT_SIGNED_URL_TTL_SECONDS, { download: true });

  if (error) throw error;
  if (!data?.signedUrl) {
    throw new Error("Academy kit signed URL was empty.");
  }
  return data.signedUrl;
}
