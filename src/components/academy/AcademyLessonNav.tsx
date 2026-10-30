import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { coursePath, lessonPath, type Course, type LessonSummary } from "@/lib/academy";
import {
  ACADEMY_NAV_BACK_TO_COURSE,
  ACADEMY_NAV_COMPLETED_NOTE,
  ACADEMY_NAV_LOCKED_LABEL,
  ACADEMY_NAV_MARK_COMPLETE,
  ACADEMY_NAV_MARK_INCOMPLETE,
  ACADEMY_NAV_NEXT_LABEL,
  ACADEMY_NAV_PREVIOUS_LABEL,
} from "@/lib/academyCopy";

type AcademyLessonNavProps = {
  course: Course;
  previous: LessonSummary | null;
  next: LessonSummary | null;
  hasAccess: boolean;
  /** Signed in and allowed to read this lesson: show Mark complete. */
  canTrack: boolean;
  isDone: boolean;
  onSetDone: (done: boolean) => void;
};

function NeighbourLink({
  course,
  lesson,
  hasAccess,
  direction,
  onClick,
}: {
  course: Course;
  lesson: LessonSummary;
  hasAccess: boolean;
  direction: "previous" | "next";
  onClick?: () => void;
}) {
  const locked = !lesson.is_preview && !hasAccess;
  const isNext = direction === "next";
  const label = isNext ? ACADEMY_NAV_NEXT_LABEL : ACADEMY_NAV_PREVIOUS_LABEL;
  return (
    <Link
      to={lessonPath(course.slug, lesson.slug)}
      onClick={onClick}
      rel={isNext ? "next" : "prev"}
      data-testid={`academy-nav-${direction}`}
      className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary/40 ${
        isNext ? "justify-end text-right" : ""
      }`}
    >
      {!isNext && <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />}
      <span className="min-w-0">
        <span className="block text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="flex items-center gap-1 font-medium break-words">
          {isNext && locked && (
            <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label={ACADEMY_NAV_LOCKED_LABEL} />
          )}
          {lesson.title}
          {!isNext && locked && (
            <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label={ACADEMY_NAV_LOCKED_LABEL} />
          )}
        </span>
      </span>
      {isNext && <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />}
    </Link>
  );
}

export function AcademyLessonNav({
  course,
  previous,
  next,
  hasAccess,
  canTrack,
  isDone,
  onSetDone,
}: AcademyLessonNavProps) {
  return (
    <nav aria-label="Lesson navigation" className="mt-10 space-y-4 border-t pt-6">
      {canTrack && (
        <div className="flex flex-wrap items-center gap-3">
          {isDone ? (
            <>
              <p className="flex items-center gap-2 text-sm text-primary">
                <Check className="h-4 w-4" aria-hidden />
                {ACADEMY_NAV_COMPLETED_NOTE}
              </p>
              <Button variant="ghost" size="sm" onClick={() => onSetDone(false)}>
                {ACADEMY_NAV_MARK_INCOMPLETE}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onSetDone(true)}>
              <Check className="h-4 w-4" aria-hidden />
              {ACADEMY_NAV_MARK_COMPLETE}
            </Button>
          )}
        </div>
      )}

      {(previous || next) && (
        <div className="flex flex-col gap-3 sm:flex-row">
          {previous ? (
            <NeighbourLink course={course} lesson={previous} hasAccess={hasAccess} direction="previous" />
          ) : (
            <span className="hidden flex-1 sm:block" aria-hidden />
          )}
          {next && (
            <NeighbourLink
              course={course}
              lesson={next}
              hasAccess={hasAccess}
              direction="next"
              // Reaching Next counts as finishing this lesson.
              onClick={canTrack && !isDone ? () => onSetDone(true) : undefined}
            />
          )}
        </div>
      )}

      <Link
        to={coursePath(course.slug)}
        className="inline-flex items-center gap-2 py-2 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {ACADEMY_NAV_BACK_TO_COURSE}
      </Link>
    </nav>
  );
}
