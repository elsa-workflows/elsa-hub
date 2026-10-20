import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { listPublishedCourses, mapCourseAccess, type Course } from "@/lib/academy";

export function useAcademyCatalog() {
  const { user, loading: authLoading } = useAuth();

  const coursesQuery = useQuery({
    queryKey: ["academy-courses"],
    queryFn: listPublishedCourses,
  });

  const courses = coursesQuery.data ?? [];

  const accessQuery = useQuery({
    queryKey: ["academy-access-map", user?.id, courses.map((course) => course.id).join(",")],
    queryFn: () => mapCourseAccess(courses.map((course) => course.id)),
    enabled: Boolean(user) && courses.length > 0,
  });

  const accessByCourseId = accessQuery.data ?? {};
  const myCourses = user
    ? courses.filter((course) => accessByCourseId[course.id])
    : [];

  return {
    courses,
    myCourses,
    accessByCourseId,
    isLoading:
      authLoading ||
      coursesQuery.isLoading || (Boolean(user) && courses.length > 0 && accessQuery.isLoading),
    isError: coursesQuery.isError || accessQuery.isError,
    error: coursesQuery.error ?? accessQuery.error,
  } satisfies {
    courses: Course[];
    myCourses: Course[];
    accessByCourseId: Record<string, boolean>;
    isLoading: boolean;
    isError: boolean;
    error: unknown;
  };
}
