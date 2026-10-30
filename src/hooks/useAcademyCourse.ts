import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useAcademyPaymentPoll } from "@/hooks/useAcademyPaymentPoll";
import {
  getPublishedCourseBySlug,
  hasAcademyAccess,
  listCourseKitAssets,
  listCourseLessons,
} from "@/lib/academy";

export function useAcademyCourse(courseSlug: string | undefined) {
  const { user, loading: authLoading } = useAuth();
  const paymentPoll = useAcademyPaymentPoll();

  const courseQuery = useQuery({
    queryKey: ["academy-course", courseSlug],
    queryFn: () => getPublishedCourseBySlug(courseSlug!),
    enabled: Boolean(courseSlug),
  });

  const course = courseQuery.data ?? null;

  const lessonsQuery = useQuery({
    queryKey: ["academy-lessons", course?.id],
    queryFn: () => listCourseLessons(course!.id),
    enabled: Boolean(course?.id),
  });

  const accessQuery = useQuery({
    queryKey: ["academy-access", course?.id, user?.id],
    queryFn: () => hasAcademyAccess(course!.id),
    enabled: Boolean(course?.id && user),
    // Back from Stripe: the webhook may not have granted access yet.
    refetchInterval: (query) => paymentPoll(query.state.data === true),
  });

  const hasAccess = accessQuery.data === true;

  const kitsQuery = useQuery({
    queryKey: ["academy-course-kits", course?.id],
    queryFn: () => listCourseKitAssets(course!.id),
    enabled: Boolean(course?.id && hasAccess),
  });

  return {
    course,
    lessons: lessonsQuery.data ?? [],
    kitAssets: hasAccess ? (kitsQuery.data ?? []) : [],
    hasAccess,
    notFound: courseQuery.isSuccess && course === null,
    // Wait for the entitlement answer too, or an entitled user sees the buy panel flash.
    isLoading:
      authLoading ||
      courseQuery.isLoading ||
      (Boolean(course) && lessonsQuery.isLoading) ||
      (Boolean(user && course) && accessQuery.isLoading),
    isError: courseQuery.isError || lessonsQuery.isError || accessQuery.isError || kitsQuery.isError,
    error: courseQuery.error ?? lessonsQuery.error ?? accessQuery.error ?? kitsQuery.error,
  };
}
