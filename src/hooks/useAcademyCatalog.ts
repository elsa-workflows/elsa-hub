import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useAcademyPaymentPoll } from "@/hooks/useAcademyPaymentPoll";
import type { AcademySoloOwnership } from "@/components/academy/AcademySoloCta";
import {
  listPersonalAcademyGrants,
  listPublishedCourses,
  mapCourseAccess,
  type Course,
} from "@/lib/academy";
import { ownsSoloBundle, soloBundleOwnership } from "@/lib/academyOwnership";

export function useAcademyCatalog() {
  const { user, loading: authLoading } = useAuth();
  const paymentPoll = useAcademyPaymentPoll();

  const coursesQuery = useQuery({
    queryKey: ["academy-courses"],
    queryFn: listPublishedCourses,
  });

  const courses = coursesQuery.data ?? [];

  // Access only: has_academy_access also lets team seats and admins in.
  const accessQuery = useQuery({
    queryKey: ["academy-access-map", user?.id, courses.map((course) => course.id).join(",")],
    queryFn: () => mapCourseAccess(courses.map((course) => course.id)),
    enabled: Boolean(user) && courses.length > 0,
    refetchInterval: (query) =>
      paymentPoll(courses.every((course) => query.state.data?.[course.id] === true)),
  });

  // Ownership: the user's own grants, so seats and admin access don't count.
  const grantsQuery = useQuery({
    queryKey: ["academy-personal-grants", user?.id],
    queryFn: () => listPersonalAcademyGrants(user!.id),
    enabled: Boolean(user),
    // Back from Stripe: recheck until the webhook grant shows up, then stop.
    refetchInterval: (query) => paymentPoll(ownsSoloBundle(query.state.data ?? [], courses)),
  });

  const accessByCourseId = accessQuery.data ?? {};
  const myCourses = user
    ? courses.filter((course) => accessByCourseId[course.id])
    : [];

  const soloOwnership = soloBundleOwnership({
    isLoading: authLoading || coursesQuery.isLoading || (Boolean(user) && grantsQuery.isLoading),
    isError: coursesQuery.isError || grantsQuery.isError,
    courses,
    grants: (user && grantsQuery.data) || [],
  });

  return {
    courses,
    myCourses,
    accessByCourseId,
    soloOwnership,
    isLoading:
      authLoading ||
      coursesQuery.isLoading ||
      (Boolean(user) && courses.length > 0 && accessQuery.isLoading),
    isError: coursesQuery.isError || accessQuery.isError,
    error: coursesQuery.error ?? accessQuery.error,
  } satisfies {
    courses: Course[];
    myCourses: Course[];
    accessByCourseId: Record<string, boolean>;
    soloOwnership: AcademySoloOwnership;
    isLoading: boolean;
    isError: boolean;
    error: unknown;
  };
}
