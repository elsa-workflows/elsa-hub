import { describe, expect, it } from "vitest";
import {
  dedupeDocsBySourceExternalId,
  shouldPruneSource,
  staleIds,
} from "../../supabase/functions/weaver-ingest/doc-sets";

describe("dedupeDocsBySourceExternalId", () => {
  it("keeps a unique list unchanged", () => {
    const docs = [
      { source: "page", external_id: "page:home", body: "a" },
      { source: "faq", external_id: "faq:one", body: "b" },
    ];
    expect(dedupeDocsBySourceExternalId(docs)).toEqual({
      docs,
      duplicateKeys: [],
    });
  });

  it("last-wins on the same (source, external_id) and is deterministic", () => {
    const docs = [
      { source: "package", external_id: "package:x", body: "first" },
      { source: "package", external_id: "package:y", body: "only" },
      { source: "package", external_id: "package:x", body: "second" },
      { source: "package", external_id: "package:x", body: "third" },
    ];
    const result = dedupeDocsBySourceExternalId(docs);
    expect(result.docs).toEqual([
      { source: "package", external_id: "package:x", body: "third" },
      { source: "package", external_id: "package:y", body: "only" },
    ]);
    expect(result.duplicateKeys).toEqual([
      { source: "package", external_id: "package:x", count: 3 },
    ]);
  });

  it("treats the same external_id under different sources as distinct", () => {
    const docs = [
      { source: "page", external_id: "same", body: "p" },
      { source: "faq", external_id: "same", body: "f" },
    ];
    expect(dedupeDocsBySourceExternalId(docs).docs).toEqual(docs);
    expect(dedupeDocsBySourceExternalId(docs).duplicateKeys).toEqual([]);
  });
});

describe("shouldPruneSource", () => {
  it("prunes only when the build succeeded and the current set is non-empty", () => {
    expect(shouldPruneSource({ ok: true, currentIds: ["a"] })).toBe(true);
  });

  it("skips prune when the fetch/build failed, even if some ids arrived", () => {
    expect(shouldPruneSource({ ok: false, currentIds: ["a", "b"] })).toBe(false);
  });

  it("skips prune when the current set is empty (zero-items rule)", () => {
    expect(shouldPruneSource({ ok: true, currentIds: [] })).toBe(false);
    expect(shouldPruneSource({ ok: false, currentIds: [] })).toBe(false);
  });
});

describe("staleIds", () => {
  it("returns existing ids that are not in the current set", () => {
    expect(staleIds(["keep", "gone", "keep-too"], ["keep", "keep-too", "new"])).toEqual([
      "gone",
    ]);
  });

  it("drops nullish existing ids", () => {
    expect(staleIds(["a", null, undefined, ""], ["a"])).toEqual([]);
  });
});
