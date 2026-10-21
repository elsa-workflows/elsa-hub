// Solo Bundle ownership guard for academy-checkout (#103).
//
// Reads the buyer's personal entitlements and the published courses, then applies
// the shared rule in _shared/academyOwnership.ts, which the catalog uses too.

import {
  ownsSoloBundle,
  type PersonalAcademyGrant,
  type PublishedAcademyCourse,
} from "../_shared/academyOwnership.ts";
import type { AcademyCourseQuery } from "./course.ts";

export type SoloBundleOwnership = "owned" | "not_owned" | "lookup_failed";

// Above PostgREST's default max-rows a page can come back truncated.
const OWNERSHIP_READ_LIMIT = 1000;

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

  const published = (courses.data ?? []) as PublishedAcademyCourse[];
  // A full page may be truncated, so it can't prove access to every course.
  if (published.length >= OWNERSHIP_READ_LIMIT) return "not_owned";

  return ownsSoloBundle((entitlements.data ?? []) as PersonalAcademyGrant[], published)
    ? "owned"
    : "not_owned";
}
