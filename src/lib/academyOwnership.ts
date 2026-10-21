import type { AcademySoloOwnership } from "@/components/academy/AcademySoloCta";

/*
 * The marked rule is mirrored in supabase/functions/_shared/academyOwnership.ts, which
 * academy-checkout uses to refuse a second Solo purchase (#103). Edit both together:
 * supabase/functions/_shared/academyOwnership_test.ts (Deno) and academyOwnership.test.ts
 * (vitest) assert they stay identical.
 */

// <solo-bundle-ownership-rule>
/** One of the buyer's own active entitlements: subject_type user, user_id the buyer, not revoked. */
export type PersonalAcademyGrant = { course_id: string | null; product_code: string | null };

export type PublishedAcademyCourse = { id: string; product_codes: string[] | null };

/**
 * Owning the Solo Bundle means a personal entitlement covers every published course, and at
 * least one course is published. A grant covers a course when it names that course, or when it
 * is a course-less bundle grant whose product_code is in the course's product_codes (the
 * personal branch of has_academy_access). A team seat or admin access lends access but is not
 * ownership, so callers pass personal grants only.
 */
export function ownsSoloBundle(
  grants: PersonalAcademyGrant[],
  published: PublishedAcademyCourse[],
): boolean {
  const covers = (course: PublishedAcademyCourse) =>
    grants.some((grant) =>
      grant.course_id === course.id ||
      (grant.course_id === null &&
        grant.product_code !== null &&
        (course.product_codes ?? []).includes(grant.product_code))
    );
  return published.length > 0 && published.every(covers);
}
// </solo-bundle-ownership-rule>

type SoloBundleOwnershipInput = {
  isLoading: boolean;
  isError: boolean;
  courses: PublishedAcademyCourse[];
  grants: PersonalAcademyGrant[];
};

/**
 * The Solo CTA's ownership state: failed when the courses or the grants could not be read,
 * otherwise unknown until both have loaded.
 */
export function soloBundleOwnership({
  isLoading,
  isError,
  courses,
  grants,
}: SoloBundleOwnershipInput): AcademySoloOwnership {
  if (isError) return "failed";
  if (isLoading) return "unknown";
  return ownsSoloBundle(grants, courses) ? "owned" : "none";
}
