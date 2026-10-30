import { useCallback, useEffect, useState } from "react";
import {
  academyProgressStorageKey,
  readAcademyProgress,
  writeAcademyProgress,
} from "@/lib/academyLessonNav";

const PROGRESS_EVENT = "elsa-academy-progress";

/**
 * Lessons a signed-in visitor marked complete in one course, kept in localStorage by user id
 * and course id. Signed-out visitors get no tracking (enabled is false).
 */
export function useAcademyProgress(userId: string | null | undefined, courseId: string | null | undefined) {
  const enabled = Boolean(userId && courseId);
  const [doneIds, setDoneIds] = useState<Set<string>>(() =>
    userId && courseId ? readAcademyProgress(userId, courseId) : new Set(),
  );

  useEffect(() => {
    if (!userId || !courseId) {
      setDoneIds(new Set());
      return;
    }
    const key = academyProgressStorageKey(userId, courseId);
    const reload = () => setDoneIds(readAcademyProgress(userId, courseId));
    reload();
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) reload();
    };
    const onLocal = (event: Event) => {
      if ((event as CustomEvent<string>).detail === key) reload();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(PROGRESS_EVENT, onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(PROGRESS_EVENT, onLocal);
    };
  }, [userId, courseId]);

  const setDone = useCallback(
    (lessonId: string, done: boolean) => {
      if (!userId || !courseId) return;
      const next = readAcademyProgress(userId, courseId);
      if (done) next.add(lessonId);
      else next.delete(lessonId);
      writeAcademyProgress(userId, courseId, next);
      setDoneIds(next);
      window.dispatchEvent(
        new CustomEvent(PROGRESS_EVENT, { detail: academyProgressStorageKey(userId, courseId) }),
      );
    },
    [userId, courseId],
  );

  return { enabled, doneIds, setDone };
}
