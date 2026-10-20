// Shared test doubles for academy-checkout tests.

type Row = Record<string, unknown>;

// Query calls that can be made to fail, to exercise error handling.
export type FailingQueryCall = "is" | "neq" | "maybeSingle";

export const SECRET_DB_ERROR = { message: "secret db detail", code: "XX000" };

// Structural stand-in for a supabase-js query on one table. Mirrors PostgREST:
// is(null) matches only NULL, and neq never matches NULL. failOn makes the
// query return SECRET_DB_ERROR: a "maybeSingle" lookup always fails, and a
// limit() list fails if the query used the is/neq filter named.
export function createQuery(rows: readonly object[], options: { failOn?: FailingQueryCall } = {}) {
  const predicates: Array<(row: Row) => boolean> = [];
  const calls = new Set<string>();
  const filter = (call: string, test: (row: Row) => boolean) => {
    calls.add(call);
    predicates.push(test);
    return api;
  };
  const match = () => rows.filter((row) => predicates.every((test) => test(row as Row)));
  // limit() fails when the query used the filter named by failOn.
  const limitFails = () => options.failOn !== undefined && calls.has(options.failOn);

  const api = {
    select: (_columns: string) => api,
    eq: (column: string, value: unknown) => filter("eq", (row) => row[column] === value),
    is: (column: string, value: null) => filter("is", (row) => (row[column] ?? null) === value),
    neq: (column: string, value: string) =>
      filter("neq", (row) => row[column] != null && row[column] !== value),
    order: () => api,
    limit: async (n: number) =>
      limitFails()
        ? { data: null, error: SECRET_DB_ERROR }
        : { data: match().slice(0, n), error: null },
    maybeSingle: async () => {
      if (options.failOn === "maybeSingle") return { data: null, error: SECRET_DB_ERROR };
      const found = match();
      if (found.length > 1) {
        return { data: null, error: { code: "PGRST116", message: "multiple rows" } };
      }
      return { data: found[0] ?? null, error: null };
    },
    single: async () => {
      const found = match();
      return found.length === 1
        ? { data: found[0], error: null }
        : { data: null, error: { message: "not found" } };
    },
  };
  return api;
}

// Runs fn with console.error silenced and returns what was logged.
export async function captureConsoleError<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; logged: string }> {
  const original = console.error;
  const logged: unknown[][] = [];
  console.error = (...args: unknown[]) => void logged.push(args);
  try {
    return { result: await fn(), logged: JSON.stringify(logged) };
  } finally {
    console.error = original;
  }
}

// n distinct published rows cloned from base, with ids and slugs bulk-0 ... bulk-(n-1).
export function bulkPublished<T extends { id: string; slug: string }>(n: number, base: T): T[] {
  return Array.from({ length: n }, (_, i) => ({
    ...base,
    id: `00000000-0000-4000-8000-${String(100000 + i).padStart(12, "0")}`,
    slug: `bulk-${i}`,
  }));
}
