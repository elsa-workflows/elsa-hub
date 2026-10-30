import type { LessonSummary } from "./academy";

/** Lessons in the course's lesson order (sort_order), ties kept in outline order. */
export function sortLessonsByCourseOrder<T extends Pick<LessonSummary, "sort_order">>(
  lessons: readonly T[],
): T[] {
  return lessons
    .map((lesson, index) => ({ lesson, index }))
    .sort((a, b) => a.lesson.sort_order - b.lesson.sort_order || a.index - b.index)
    .map(({ lesson }) => lesson);
}

export type LessonNeighbours<T> = {
  previous: T | null;
  next: T | null;
  /** 1-based position of the current lesson, or 0 when it is not in the outline. */
  position: number;
  total: number;
};

export function lessonNeighbours<T extends Pick<LessonSummary, "id" | "sort_order">>(
  lessons: readonly T[],
  currentLessonId: string,
): LessonNeighbours<T> {
  const ordered = sortLessonsByCourseOrder(lessons);
  const index = ordered.findIndex((lesson) => lesson.id === currentLessonId);
  if (index === -1) {
    return { previous: null, next: null, position: 0, total: ordered.length };
  }
  return {
    previous: index > 0 ? ordered[index - 1] : null,
    next: index < ordered.length - 1 ? ordered[index + 1] : null,
    position: index + 1,
    total: ordered.length,
  };
}

export type LessonProgressState = "done" | "current" | "upcoming";

/** Done wins over current, so a finished lesson you are rereading still shows as done. */
export function lessonProgressState(
  lessonId: string,
  currentLessonId: string | null,
  doneIds: ReadonlySet<string>,
): LessonProgressState {
  if (doneIds.has(lessonId)) return "done";
  if (lessonId === currentLessonId) return "current";
  return "upcoming";
}

/** Only counts done ids that are still in this course's outline. */
export function countDoneLessons(
  lessons: readonly Pick<LessonSummary, "id">[],
  doneIds: ReadonlySet<string>,
): number {
  return lessons.reduce((count, lesson) => count + (doneIds.has(lesson.id) ? 1 : 0), 0);
}

/** On the course page the "current" lesson is the first one not done yet. */
export function firstUnfinishedLessonId(
  lessons: readonly Pick<LessonSummary, "id" | "sort_order">[],
  doneIds: ReadonlySet<string>,
): string | null {
  return sortLessonsByCourseOrder(lessons).find((lesson) => !doneIds.has(lesson.id))?.id ?? null;
}

/*
 * Progress storage. There is no lesson or lab progress table in the Hub schema, so progress
 * lives in localStorage, keyed by user id and course id, until a server-side table exists.
 */
export const ACADEMY_PROGRESS_STORAGE_PREFIX = "elsa.academy.progress.v1";

export function academyProgressStorageKey(userId: string, courseId: string): string {
  return `${ACADEMY_PROGRESS_STORAGE_PREFIX}:${userId}:${courseId}`;
}

type ProgressStorage = Pick<Storage, "getItem" | "setItem">;

function defaultStorage(): ProgressStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readAcademyProgress(
  userId: string,
  courseId: string,
  storage: ProgressStorage | null = defaultStorage(),
): Set<string> {
  if (!storage) return new Set();
  try {
    const raw = storage.getItem(academyProgressStorageKey(userId, courseId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

export function writeAcademyProgress(
  userId: string,
  courseId: string,
  doneIds: ReadonlySet<string>,
  storage: ProgressStorage | null = defaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(academyProgressStorageKey(userId, courseId), JSON.stringify([...doneIds]));
  } catch {
    // Storage full or blocked (private mode): progress just is not kept.
  }
}
