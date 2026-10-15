import type { AcademyAsset, Course, LessonSummary } from "@/lib/academy";

const SOLO_COURSE_ID = "stub-course-solo-bundle";

export const ACADEMY_STUB_COURSES: Course[] = [
  {
    id: SOLO_COURSE_ID,
    slug: "elsa-3-solo-bundle",
    title: "Elsa 3 Solo Bundle",
    summary:
      "Self-paced Elsa 3 course and lab kit for hosting, Studio, HTTP workflows and approvals.",
    sort_order: 1,
    is_published: true,
    price_cents: 2900,
    currency: "eur",
    stripe_price_id: null,
    product_code: "solo_bundle",
  },
];

export const ACADEMY_STUB_LESSONS: LessonSummary[] = [
  {
    id: "stub-lesson-welcome",
    course_id: SOLO_COURSE_ID,
    slug: "welcome",
    title: "Welcome and how this course works",
    sort_order: 1,
    is_preview: true,
  },
  {
    id: "stub-lesson-hosting",
    course_id: SOLO_COURSE_ID,
    slug: "host-elsa-in-aspnet-core",
    title: "Host Elsa in ASP.NET Core",
    sort_order: 2,
    is_preview: false,
  },
];

export const ACADEMY_STUB_LESSON_BODIES: Record<string, string> = {
  "stub-lesson-welcome": [
    "This preview lesson is free. It explains how the Solo Bundle is organised.",
    "",
    "1. Work through each lesson in order.",
    "2. Download the lab kit after you unlock the course.",
    "3. Use the Studio journal to confirm every path.",
  ].join("\n"),
  "stub-lesson-hosting": [
    "Host Elsa 3.9.0 in an ASP.NET Core app with SQLite persistence.",
    "",
    "This body is only returned when `has_academy_access` is true.",
  ].join("\n"),
};

export const ACADEMY_STUB_ASSETS: AcademyAsset[] = [
  {
    id: "stub-asset-course-kit",
    course_id: SOLO_COURSE_ID,
    lesson_id: null,
    label: "Solo Bundle lab kit",
    storage_path: "solo-bundle/kit.zip",
  },
  {
    id: "stub-asset-hosting-kit",
    course_id: SOLO_COURSE_ID,
    lesson_id: "stub-lesson-hosting",
    label: "Hosting lab files",
    storage_path: "solo-bundle/host-elsa-in-aspnet-core/kit.zip",
  },
];
