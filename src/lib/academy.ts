import { supabase } from "@/integrations/supabase/client";
import {
  ACADEMY_MY_COURSES_HASH,
  ACADEMY_MY_COURSES_ID,
  ACADEMY_PATH,
  ACADEMY_SOLO_BUNDLE_HASH,
  ACADEMY_SOLO_BUNDLE_ID,
} from "./academyPaths";
import type { PersonalAcademyGrant } from "./academyOwnership";

export {
  ACADEMY_MY_COURSES_HASH,
  ACADEMY_MY_COURSES_ID,
  ACADEMY_PATH,
  ACADEMY_SOLO_BUNDLE_HASH,
  ACADEMY_SOLO_BUNDLE_ID,
};
export const ACADEMY_KITS_BUCKET = "academy-kits";
export const ACADEMY_KIT_SIGNED_URL_TTL_SECONDS = 600;

export const ACADEMY_COURSE_COLUMNS =
  "id, slug, title, summary, sort_order, is_published, price_cents, currency, stripe_price_id, product_code, product_codes";

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
  product_codes: string[];
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
  /** The full course outline in course order, from the same academy_course_outline call. */
  lessons: LessonSummary[];
};

type AcademyClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string | boolean) => AcademyFilter;
      or: (filters: string) => AcademyFilter;
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

/** Team packs are sold from the Training page. */
export const ACADEMY_TEAM_LICENCES_URL = "/elsa-plus/training";

type FindAcademyAnchor = (id: string) => { scrollIntoView: () => void } | null;

const findAcademyAnchor: FindAcademyAnchor = (id) =>
  typeof document === "undefined" ? null : document.getElementById(id);

/** Catalogue sections that render late (after data loads), keyed by URL hash. */
const ACADEMY_CATALOG_ANCHORS: Record<string, string> = {
  [ACADEMY_SOLO_BUNDLE_HASH]: ACADEMY_SOLO_BUNDLE_ID,
  [ACADEMY_MY_COURSES_HASH]: ACADEMY_MY_COURSES_ID,
};

/** Scrolls a catalogue section named by the hash into view once it exists. */
export function scrollAcademyCatalogAnchorIntoView(
  hash: string,
  findElement: FindAcademyAnchor = findAcademyAnchor,
): boolean {
  const id = ACADEMY_CATALOG_ANCHORS[hash];
  if (!id) return false;
  const target = findElement(id);
  if (!target) return false;
  target.scrollIntoView();
  return true;
}

export function scrollAcademySoloBundleIntoView(
  hash: string,
  findElement: FindAcademyAnchor = findAcademyAnchor,
): boolean {
  if (hash !== ACADEMY_SOLO_BUNDLE_HASH) return false;
  return scrollAcademyCatalogAnchorIntoView(hash, findElement);
}

/**
 * Body for the academy-checkout function (main, #86). Solo is a published
 * course selected by courseId or courseSlug, never both, and never with
 * organizationId. Every published course sells the Solo Bundle, so any
 * published course id buys it. A bare { productCode: "solo_bundle" } is
 * rejected with 400; productCode is for Team SKUs only.
 */
export function academyCheckoutFields(courseId: string) {
  return { courseId };
}

/**
 * academy-checkout's 409 error code when the buyer already owns the Solo Bundle (#103).
 * Mirrored in supabase/functions/_shared/academyOwnership.ts; its test asserts they match.
 */
export const ACADEMY_ALREADY_OWNED = "already_owned";

/** What a Solo buy action reports back to the CTA. */
export type AcademyBuyOutcome = typeof ACADEMY_ALREADY_OWNED | undefined;

/**
 * True when a supabase.functions.invoke error is academy-checkout's 409 already_owned, so the
 * buy action can return ACADEMY_ALREADY_OWNED and the CTA shows the owned note.
 */
export async function isAcademyAlreadyOwnedError(error: unknown): Promise<boolean> {
  const response = (error as { context?: unknown } | null)?.context;
  if (!(response instanceof Response) || response.status !== 409) return false;
  try {
    const body = await response.clone().json();
    return body?.error === ACADEMY_ALREADY_OWNED;
  } catch {
    return false;
  }
}

/** Sends the browser to a Stripe Checkout URL. Split out so tests can stub navigation. */
export const academyNavigate = {
  assign(url: string): void {
    window.location.assign(url);
  },
};

/**
 * Starts Solo Bundle checkout through academy-checkout (main, #86). Every published course
 * sells the Solo Bundle, so any published course id buys it; without one, the first published
 * course is used. Rejects with the invoke error so the CTA can map 409 already_owned to the
 * owned note and show the failure toast for anything else.
 */
export async function handleBuyCourse(courseId?: string): Promise<AcademyBuyOutcome> {
  const id = courseId ?? (await listPublishedCourses())[0]?.id;
  if (!id) throw new Error("No published Academy course to buy");
  const { data, error } = await supabase.functions.invoke("academy-checkout", {
    body: academyCheckoutFields(id),
  });
  if (error) throw error;
  const checkoutUrl = (data as { checkoutUrl?: unknown } | null)?.checkoutUrl;
  if (typeof checkoutUrl !== "string" || !checkoutUrl.startsWith("https://")) {
    throw new Error("academy-checkout returned no checkout URL");
  }
  academyNavigate.assign(checkoutUrl);
  return undefined;
}

type AcademyStubModule = typeof import("./academyStub");

async function loadAcademyStub(): Promise<AcademyStubModule | null> {
  // Inline on import.meta.env (not a helper taking the env object) so Vite folds it and tree-shakes the stub from production builds.
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
  return { course, lesson, lessons };
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

/**
 * The signed-in user's own active entitlements, which decide Solo Bundle ownership. The explicit
 * user_id filter matters: RLS returns every entitlement row to platform admins.
 */
export async function listPersonalAcademyGrants(userId: string): Promise<PersonalAcademyGrant[]> {
  const { data, error } = await academyClient
    .from("academy_entitlements")
    .select("course_id, product_code")
    .eq("user_id", userId)
    .eq("subject_type", "user")
    .is("revoked_at", null);

  if (error) {
    if (isMissingAcademyRelation(error)) return [];
    throw error;
  }

  return (data ?? []) as PersonalAcademyGrant[];
}

/** Access only (My courses, lesson unlocks): has_academy_access also counts team seats and admins. */
export async function mapCourseAccess(courseIds: string[]): Promise<Record<string, boolean>> {
  const uniqueIds = [...new Set(courseIds)];
  const entries = await Promise.all(
    uniqueIds.map(async (id) => [id, await hasAcademyAccess(id)] as const),
  );
  return Object.fromEntries(entries);
}

/** Storage prefix of the shared lab kit. One asset row owns it (UNIQUE storage_path), every course shows it. */
export const ACADEMY_SHARED_KIT_PREFIX = "kits/";

export async function listCourseKitAssets(courseId: string): Promise<AcademyAsset[]> {
  const { data, error } = await academyClient
    .from("academy_assets")
    .select(ACADEMY_ASSET_COLUMNS)
    .or(`course_id.eq.${courseId},storage_path.like.${ACADEMY_SHARED_KIT_PREFIX}*`)
    .is("lesson_id", null)
    .order("label", { ascending: true });

  if (error) {
    return onMissingAcademyRelation(
      error,
      (stub) =>
        stub.ACADEMY_STUB_ASSETS.filter(
          (asset) =>
            asset.lesson_id === null &&
            (asset.course_id === courseId || asset.storage_path.startsWith(ACADEMY_SHARED_KIT_PREFIX)),
        ),
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
