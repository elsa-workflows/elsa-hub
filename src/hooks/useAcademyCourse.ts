import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPublishedCourseBySlug,
  hasAcademyAccess,
  listCourseKitAssets,
  listCourseLessons,
} from "@/lib/academy";

export function useAcademyCourse(courseSlug: string | undefined) {
  const { user } = useAuth();

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
    isLoading: courseQuery.isLoading || (Boolean(course) && lessonsQuery.isLoading),
    isError: courseQuery.isError || lessonsQuery.isError || accessQuery.isError || kitsQuery.isError,
    error: courseQuery.error ?? lessonsQuery.error ?? accessQuery.error ?? kitsQuery.error,
  };
}
