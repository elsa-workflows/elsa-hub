import { useAuth } from "@/contexts/AuthContext";
import { useAcademyProgress } from "@/hooks/useAcademyProgress";
import type { Course, LessonSummary } from "@/lib/academy";
import { firstUnfinishedLessonId } from "@/lib/academyLessonNav";
import { AcademyCourseOutline } from "./AcademyCourseOutline";

type AcademyCourseProgressProps = {
  course: Course;
  lessons: LessonSummary[];
  hasAccess: boolean;
};

/** Course page lesson list with done, current and upcoming marks and an "X of Y done" bar. */
export function AcademyCourseProgress({ course, lessons, hasAccess }: AcademyCourseProgressProps) {
  const { user } = useAuth();
  const progress = useAcademyProgress(user?.id, course.id);
  return (
    <AcademyCourseOutline
      course={course}
      lessons={lessons}
      hasAccess={hasAccess}
      currentLessonId={progress.enabled ? firstUnfinishedLessonId(lessons, progress.doneIds) : null}
      doneIds={progress.doneIds}
      trackProgress={progress.enabled}
    />
  );
}
