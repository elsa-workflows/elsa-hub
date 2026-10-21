/**
 * Solo Bundle ownership for Edge Functions (#103).
 * The marked rule is copied from src/lib/academyOwnership.ts, because Edge Functions cannot
 * import src/lib. academyOwnership_test.ts (Deno) and src/lib/academyOwnership.test.ts (vitest)
 * read both files as text and assert the rule and ACADEMY_ALREADY_OWNED (src/lib/academy.ts) stay
 * identical.
 */

/** academy-checkout's 409 error code when the buyer already owns the Solo Bundle. */
export const ACADEMY_ALREADY_OWNED = "already_owned";

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
