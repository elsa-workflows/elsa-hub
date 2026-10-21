import type { Course } from "@/lib/academy";
import type { AcademySoloOwnership } from "@/components/academy/AcademySoloCta";

type SoloBundleOwnershipInput = {
  isLoading: boolean;
  isError: boolean;
  courses: Pick<Course, "id">[];
  hasAccess: Record<string, boolean>;
};

/**
 * has_academy_access also grants via a single-course entitlement, a team seat or an admin, so
 * only access to every published course counts as owning the bundle.
 * academy-checkout mirrors this rule server side, counting personal entitlements only
 * (supabase/functions/academy-checkout/ownership.ts). Keep the two in step.
 */
export function soloBundleOwnership({
  isLoading,
  isError,
  courses,
  hasAccess,
}: SoloBundleOwnershipInput): AcademySoloOwnership {
  if (isLoading || isError) return "unknown";
  return courses.length > 0 && courses.every((course) => hasAccess[course.id]) ? "owned" : "none";
}
