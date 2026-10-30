import type { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAcademyProgress } from "@/hooks/useAcademyProgress";
import type { Course, LessonSummary } from "@/lib/academy";
import { lessonNeighbours } from "@/lib/academyLessonNav";
import { AcademyCourseOutline } from "./AcademyCourseOutline";
import { AcademyLessonNav } from "./AcademyLessonNav";

type AcademyLessonFrameProps = {
  course: Course;
  lesson: LessonSummary;
  /** Course outline from useAcademyLesson (same academy_course_outline call as the page meta). */
  lessons?: LessonSummary[];
  hasAccess: boolean;
  canRead: boolean;
  /** The lesson article. */
  children: ReactNode;
};

/**
 * Lesson page shell: course outline with progress (sidebar on desktop, collapsible on small
 * screens) next to the lesson, and Previous / Next / Back to course under it.
 */
export function AcademyLessonFrame({
  course,
  lesson,
  lessons = [],
  hasAccess,
  canRead,
  children,
}: AcademyLessonFrameProps) {
  const { user } = useAuth();
  const progress = useAcademyProgress(user?.id, course.id);
  const outline = lessons.length > 0 ? lessons : [lesson];
  const { previous, next } = lessonNeighbours(outline, lesson.id);
  const canTrack = progress.enabled && canRead;

  return (
    <div className="container pb-20 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start lg:gap-10">
      {lessons.length > 0 && (
        <aside className="mb-8 lg:sticky lg:top-24 lg:mb-0">
          <AcademyCourseOutline
            course={course}
            lessons={outline}
            hasAccess={hasAccess}
            currentLessonId={lesson.id}
            doneIds={progress.doneIds}
            trackProgress={progress.enabled}
            collapsible
            showPosition
          />
        </aside>
      )}
      <div className="min-w-0 lg:col-start-2 [&>article]:mx-0 [&>article]:max-w-3xl [&>article]:px-0 [&>article]:pb-0">
        {children}
        <AcademyLessonNav
          course={course}
          previous={previous}
          next={next}
          hasAccess={hasAccess}
          canTrack={canTrack}
          isDone={progress.doneIds.has(lesson.id)}
          onSetDone={(done) => progress.setDone(lesson.id, done)}
        />
      </div>
    </div>
  );
}
