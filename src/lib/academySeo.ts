import { ACADEMY_PATH, type Course, type LessonSummary } from "@/lib/academy";

export const ACADEMY_TITLE = "Academy | Elsa Workflows";
export const ACADEMY_DESCRIPTION =
  "Browse published Elsa Academy courses, preview free lessons, and continue the ones you already own.";

export function academyCourseTitle(course: Pick<Course, "title">): string {
  return `${course.title} | Elsa Academy`;
}

export function academyCourseDescription(course: Pick<Course, "title" | "summary">): string {
  return course.summary?.trim() || `Lesson list and pricing for ${course.title}.`;
}

export function academyLessonTitle(
  lesson: Pick<LessonSummary, "title">,
  course: Pick<Course, "title">,
): string {
  return `${lesson.title} | ${course.title}`;
}

export function academyLessonDescription(
  lesson: Pick<LessonSummary, "title">,
  course: Pick<Course, "title">,
): string {
  return `${lesson.title} from ${course.title} on Elsa Academy.`;
}

export function academyCourseJsonLd(course: Course, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: academyCourseDescription(course),
    url: path,
    provider: {
      "@type": "Organization",
      name: "Elsa Workflows",
      url: "https://www.elsaworkflows.io",
    },
  };
}

export function academyCatalogJsonLd(courses: Course[], origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Elsa Academy",
    itemListElement: courses.map((course, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${origin}${ACADEMY_PATH}/${course.slug}`,
      name: course.title,
    })),
  };
}
