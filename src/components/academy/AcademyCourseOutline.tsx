import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ChevronDown, Circle, CircleDot, Lock, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { lessonPath, type Course, type LessonSummary } from "@/lib/academy";
import {
  countDoneLessons,
  lessonNeighbours,
  lessonProgressState,
  sortLessonsByCourseOrder,
  type LessonProgressState,
} from "@/lib/academyLessonNav";
import {
  ACADEMY_NAV_CURRENT_LABEL,
  ACADEMY_NAV_DONE_LABEL,
  ACADEMY_NAV_HIDE_OUTLINE,
  ACADEMY_NAV_LOCKED_LABEL,
  ACADEMY_NAV_OUTLINE_HEADING,
  ACADEMY_NAV_PREVIEW_LABEL,
  ACADEMY_NAV_PROGRESS_DEVICE_NOTE,
  ACADEMY_NAV_PROGRESS_SIGNED_OUT,
  ACADEMY_NAV_SHOW_OUTLINE,
  ACADEMY_NAV_UPCOMING_LABEL,
  academyLessonPositionLabel,
  academyProgressLabel,
} from "@/lib/academyCopy";

type AcademyCourseOutlineProps = {
  course: Course;
  lessons: LessonSummary[];
  hasAccess: boolean;
  /** Lesson being viewed (lesson page) or the next one to do (course page); highlighted. */
  currentLessonId: string | null;
  doneIds: ReadonlySet<string>;
  /** False for signed-out visitors: no done marks and no progress bar. */
  trackProgress: boolean;
  /** Lesson page: a sidebar on desktop that folds into a toggle on small screens. */
  collapsible?: boolean;
  /** Show "Lesson X of Y" for the current lesson. */
  showPosition?: boolean;
};

const STATE_LABEL: Record<LessonProgressState, string> = {
  done: ACADEMY_NAV_DONE_LABEL,
  current: ACADEMY_NAV_CURRENT_LABEL,
  upcoming: ACADEMY_NAV_UPCOMING_LABEL,
};

function StateIcon({ state }: { state: LessonProgressState }) {
  const label = STATE_LABEL[state];
  if (state === "done") {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-label={label} role="img" />;
  }
  if (state === "current") {
    return <CircleDot className="h-4 w-4 shrink-0 text-primary" aria-label={label} role="img" />;
  }
  return <Circle className="h-4 w-4 shrink-0 text-muted-foreground" aria-label={label} role="img" />;
}

export function AcademyCourseOutline({
  course,
  lessons,
  hasAccess,
  currentLessonId,
  doneIds,
  trackProgress,
  collapsible = false,
  showPosition = false,
}: AcademyCourseOutlineProps) {
  const [open, setOpen] = useState(false);
  const ordered = sortLessonsByCourseOrder(lessons);
  const total = ordered.length;
  const done = countDoneLessons(ordered, doneIds);
  const { position } = currentLessonId
    ? lessonNeighbours(ordered, currentLessonId)
    : { position: 0 };
  const positionLabel = showPosition && position > 0 ? academyLessonPositionLabel(position, total) : null;

  const summary = (
    <div className="space-y-2" data-testid="academy-outline-summary">
      {positionLabel && <p className="text-sm font-medium">{positionLabel}</p>}
      {trackProgress ? (
        <div className="space-y-1">
          <Progress
            value={total === 0 ? 0 : Math.round((done / total) * 100)}
            className="h-2"
            aria-label={academyProgressLabel(done, total)}
          />
          <p className="text-xs text-muted-foreground">{academyProgressLabel(done, total)}</p>
          <p className="text-xs text-muted-foreground">{ACADEMY_NAV_PROGRESS_DEVICE_NOTE}</p>
        </div>
      ) : (
        collapsible && <p className="text-xs text-muted-foreground">{ACADEMY_NAV_PROGRESS_SIGNED_OUT}</p>
      )}
    </div>
  );

  const list = (
    <ol className={cn(collapsible ? "space-y-1" : "space-y-3")} aria-label={ACADEMY_NAV_OUTLINE_HEADING}>
      {ordered.map((lesson, index) => {
        const isCurrent = lesson.id === currentLessonId;
        const state = lessonProgressState(lesson.id, currentLessonId, doneIds);
        const unlocked = lesson.is_preview || hasAccess;
        return (
          <li key={lesson.id} data-testid="academy-outline-lesson" data-state={trackProgress ? state : undefined}>
            <Link
              to={lessonPath(course.slug, lesson.slug)}
              aria-current={isCurrent && collapsible ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg border transition-colors hover:border-primary/40",
                collapsible ? "px-3 py-2 text-sm" : "bg-card p-4",
                isCurrent && "border-primary bg-primary/5",
                !unlocked && "text-muted-foreground",
              )}
            >
              {trackProgress ? (
                <StateIcon state={state} />
              ) : (
                <span className="text-sm text-muted-foreground w-6 shrink-0">{index + 1}</span>
              )}
              <span className={cn("flex-1 min-w-0 break-words", isCurrent ? "font-semibold" : "font-medium")}>
                {lesson.title}
              </span>
              {lesson.is_preview ? (
                <Badge variant="secondary" className="shrink-0">
                  {ACADEMY_NAV_PREVIEW_LABEL}
                </Badge>
              ) : unlocked ? (
                <Unlock className="h-4 w-4 shrink-0 text-primary" aria-label="Unlocked" />
              ) : (
                <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-label={ACADEMY_NAV_LOCKED_LABEL} />
              )}
            </Link>
          </li>
        );
      })}
    </ol>
  );

  if (!collapsible) {
    return (
      <div className="space-y-4">
        {trackProgress && summary}
        {list}
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 min-w-0 flex-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {ACADEMY_NAV_OUTLINE_HEADING}
          </h2>
          {summary}
        </div>
        <CollapsibleTrigger
          className="lg:hidden inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-xs font-medium"
          aria-label={open ? ACADEMY_NAV_HIDE_OUTLINE : ACADEMY_NAV_SHOW_OUTLINE}
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden />
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent forceMount className="space-y-3 data-[state=closed]:hidden lg:data-[state=closed]:block">
        {list}
      </CollapsibleContent>
    </Collapsible>
  );
}
