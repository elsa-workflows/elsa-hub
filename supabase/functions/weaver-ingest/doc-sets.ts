/** Pure helpers for weaver-ingest. No Deno / network imports. */

export type DocKey = {
  source: string;
  external_id: string;
};

export type DuplicateKey = DocKey & { count: number };

/**
 * Last-wins on (source, external_id). First-seen key order is preserved so
 * the result is deterministic. Duplicate keys (count > 1) are returned for logging.
 */
export function dedupeDocsBySourceExternalId<T extends DocKey>(docs: T[]): {
  docs: T[];
  duplicateKeys: DuplicateKey[];
} {
  const lastByKey = new Map<string, T>();
  const counts = new Map<string, number>();
  const order: string[] = [];

  for (const doc of docs) {
    const key = `${doc.source}\t${doc.external_id}`;
    if (!lastByKey.has(key)) order.push(key);
    lastByKey.set(key, doc);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const duplicateKeys: DuplicateKey[] = [];
  for (const [key, count] of counts) {
    if (count < 2) continue;
    const [source, external_id] = key.split("\t");
    duplicateKeys.push({ source, external_id, count });
  }

  return {
    docs: order.map((key) => lastByKey.get(key)!),
    duplicateKeys,
  };
}

/**
 * Never prune a source unless this run's fetch/build fully succeeded AND the
 * current id set is non-empty. An empty set is treated as suspicious (upstream
 * failure or a true empty catalog) so we refuse to wipe the source.
 */
export function shouldPruneSource(input: {
  ok: boolean;
  currentIds: readonly string[];
}): boolean {
  return input.ok && input.currentIds.length > 0;
}

export function staleIds(
  existing: readonly (string | null | undefined)[],
  currentIds: readonly string[],
): string[] {
  const keep = new Set(currentIds);
  return existing.filter((id): id is string => !!id && !keep.has(id));
}
