import { describe, expect, it } from "vitest";
import {
  academyProgressStorageKey,
  countDoneLessons,
  firstUnfinishedLessonId,
  lessonNeighbours,
  lessonProgressState,
  readAcademyProgress,
  sortLessonsByCourseOrder,
  writeAcademyProgress,
} from "./academyLessonNav";
import { academyLessonPositionLabel, academyProgressLabel } from "./academyCopy";

// Deliberately out of order: navigation must follow sort_order, not array order.
const lessons = [
  { id: "c", sort_order: 30, title: "Third" },
  { id: "a", sort_order: 10, title: "First" },
  { id: "b", sort_order: 20, title: "Second" },
];

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    map,
  };
}

describe("lesson order and neighbours", () => {
  it("orders lessons by sort_order", () => {
    expect(sortLessonsByCourseOrder(lessons).map((l) => l.id)).toEqual(["a", "b", "c"]);
  });

  it("gives the middle lesson both neighbours in course order", () => {
    const nav = lessonNeighbours(lessons, "b");
    expect(nav.previous?.id).toBe("a");
    expect(nav.next?.id).toBe("c");
    expect(nav.position).toBe(2);
    expect(nav.total).toBe(3);
  });

  it("has no Previous on the first lesson", () => {
    const nav = lessonNeighbours(lessons, "a");
    expect(nav.previous).toBeNull();
    expect(nav.next?.id).toBe("b");
    expect(nav.position).toBe(1);
  });

  it("has no Next on the last lesson", () => {
    const nav = lessonNeighbours(lessons, "c");
    expect(nav.previous?.id).toBe("b");
    expect(nav.next).toBeNull();
    expect(nav.position).toBe(3);
  });

  it("returns position 0 and no neighbours for a lesson outside the outline", () => {
    expect(lessonNeighbours(lessons, "zzz")).toEqual({ previous: null, next: null, position: 0, total: 3 });
  });

  it("formats Lesson X of Y and X of Y done without dashes", () => {
    expect(academyLessonPositionLabel(2, 5)).toBe("Lesson 2 of 5");
    expect(academyProgressLabel(1, 5)).toBe("1 of 5 done");
  });
});

describe("progress states", () => {
  const done = new Set(["a"]);

  it("marks done, current and upcoming lessons", () => {
    expect(lessonProgressState("a", "b", done)).toBe("done");
    expect(lessonProgressState("b", "b", done)).toBe("current");
    expect(lessonProgressState("c", "b", done)).toBe("upcoming");
  });

  it("keeps a finished lesson as done while it is being reread", () => {
    expect(lessonProgressState("a", "a", done)).toBe("done");
  });

  it("counts only done ids that are in this course", () => {
    expect(countDoneLessons(lessons, new Set(["a", "c", "other-course-lesson"]))).toBe(2);
  });

  it("picks the first unfinished lesson in course order as current on the course page", () => {
    expect(firstUnfinishedLessonId(lessons, new Set(["a"]))).toBe("b");
    expect(firstUnfinishedLessonId(lessons, new Set(["a", "b", "c"]))).toBeNull();
  });
});

describe("progress storage", () => {
  it("keys progress by user id and course id", () => {
    expect(academyProgressStorageKey("user-1", "course-1")).toBe("elsa.academy.progress.v1:user-1:course-1");
  });

  it("round-trips done lesson ids and keeps users and courses apart", () => {
    const storage = memoryStorage();
    writeAcademyProgress("user-1", "course-1", new Set(["a", "b"]), storage);
    expect([...readAcademyProgress("user-1", "course-1", storage)]).toEqual(["a", "b"]);
    expect(readAcademyProgress("user-2", "course-1", storage).size).toBe(0);
    expect(readAcademyProgress("user-1", "course-2", storage).size).toBe(0);
  });

  it("ignores corrupt or missing storage", () => {
    const storage = memoryStorage();
    storage.map.set(academyProgressStorageKey("user-1", "course-1"), "{not json");
    expect(readAcademyProgress("user-1", "course-1", storage).size).toBe(0);
    expect(readAcademyProgress("user-1", "course-1", null).size).toBe(0);
  });
});
