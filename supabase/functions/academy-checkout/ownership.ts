// Solo Bundle ownership guard for academy-checkout (#103).
//
// Mirrors soloBundleOwnership in src/lib/academyOwnership.ts, which hides Buy in
// the catalog: the buyer owns the bundle only with access to every published
// course, and at least one is published. Keep the two in step.
//
// Access per course follows the personal-entitlement branch of
// has_academy_access (supabase/migrations/20261015190000_academy_schema_r2.sql):
// an active entitlement for the course itself, or a course-less bundle
// entitlement whose product_code is in the course's product_codes. Only the
// buyer's own grants (subject_type user) count. A team seat or platform admin
// access is not a purchase the Solo Bundle would duplicate, so it doesn't block.

import type { AcademyCourseQuery } from "./course.ts";

export type SoloBundleOwnership = "owned" | "not_owned" | "lookup_failed";

// Above PostgREST's default max-rows a page can come back truncated.
const OWNERSHIP_READ_LIMIT = 1000;

type EntitlementGrant = { course_id: string | null; product_code: string | null };
type PublishedCourse = { id: string; product_codes: string[] | null };

export async function soloBundleOwnership(
  serviceClient: AcademyCourseQuery,
  userId: string,
): Promise<SoloBundleOwnership> {
  const [entitlements, courses] = await Promise.all([
    serviceClient
      .from("academy_entitlements")
      .select("course_id, product_code")
      .eq("user_id", userId)
      .eq("subject_type", "user")
      .is("revoked_at", null)
      .limit(OWNERSHIP_READ_LIMIT),
    serviceClient
      .from("academy_courses")
      .select("id, product_codes")
      .eq("is_published", true)
      .limit(OWNERSHIP_READ_LIMIT),
  ]);

  const failed = entitlements.error ?? courses.error;
  if (failed) {
    console.error("Academy entitlement lookup failed:", failed);
    return "lookup_failed";
  }

  const grants = (entitlements.data ?? []) as EntitlementGrant[];
  const published = (courses.data ?? []) as PublishedCourse[];
  // A full page may be truncated, so it can't prove access to every course.
  if (published.length === 0 || published.length >= OWNERSHIP_READ_LIMIT) return "not_owned";

  const covers = (course: PublishedCourse) =>
    grants.some((grant) =>
      grant.course_id === course.id ||
      (grant.course_id === null &&
        grant.product_code !== null &&
        (course.product_codes ?? []).includes(grant.product_code))
    );
  return published.every(covers) ? "owned" : "not_owned";
}
