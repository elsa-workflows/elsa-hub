import { Link } from "react-router-dom";
import { Lock, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { lessonPath, type Course, type LessonSummary } from "@/lib/academy";

type AcademyLessonListProps = {
  course: Course;
  lessons: LessonSummary[];
  hasAccess: boolean;
};

export function AcademyLessonList({ course, lessons, hasAccess }: AcademyLessonListProps) {
  return (
    <ol className="space-y-3">
      {lessons.map((lesson, index) => {
        const open = lesson.is_preview || hasAccess;
        return (
          <li key={lesson.id}>
            <Link
              to={lessonPath(course.slug, lesson.slug)}
              className="flex items-center gap-3 rounded-lg border bg-card p-4 hover:border-primary/40 transition-colors"
            >
              <span className="text-sm text-muted-foreground w-6 shrink-0">{index + 1}</span>
              <span className="font-medium flex-1">{lesson.title}</span>
              {lesson.is_preview ? (
                <Badge variant="secondary">Preview</Badge>
              ) : open ? (
                <Unlock className="h-4 w-4 text-primary" aria-label="Unlocked" />
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground" aria-label="Locked" />
              )}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
