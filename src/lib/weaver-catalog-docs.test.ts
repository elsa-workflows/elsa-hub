import { describe, expect, it } from "vitest";
import { buildPackageDocs, packageDocsPruneOk } from "../../supabase/functions/weaver-ingest/catalog-docs";

const liveShapeFixture = {
  packages: [
    {
      packageId: "Elsa.Http",
      displayName: "Http",
      latestVersion: "3.10.0-preview.1",
      source: { name: "Feedz" },
      versions: [{ version: "3.10.0-preview.1", features: [{ featureId: "Elsa.Http.Preview" }] }],
    },
    {
      packageId: "Elsa.Http",
      displayName: "Http",
      latestVersion: "3.9.0",
      source: { name: "NuGet" },
      versions: [
        { version: "3.8.0", features: [] },
        { version: "3.9.0", features: [{ featureId: "Elsa.Http.Http", displayName: "HTTP", description: "Activities" }] },
      ],
    },
    { displayName: "no id" },
  ],
};

describe("buildPackageDocs", () => {
  it("maps the live catalog shape and keeps one doc per packageId, NuGet first", () => {
    const docs = buildPackageDocs(liveShapeFixture, "https://site");
    expect(docs.map((d) => d.external_id)).toEqual(["package:Elsa.Http"]);
    expect(docs[0].metadata).toMatchObject({ version: "3.9.0", feed: "NuGet" });
    expect(docs[0].body).toContain("- Elsa.Http.Http: HTTP: Activities");
  });

  it("skips entries with no packageId or id", () => {
    const docs = buildPackageDocs({ packages: [{ displayName: "no id" }] }, "https://site");
    expect(docs).toEqual([]);
  });

  it("takes features from the latestVersion entry, not an older versions[] row", () => {
    const docs = buildPackageDocs(
      {
        packages: [
          {
            packageId: "Elsa.Only",
            latestVersion: "2.0.0",
            source: { name: "NuGet" },
            versions: [
              { version: "1.0.0", features: [{ featureId: "old" }] },
              { version: "2.0.0", features: [{ featureId: "new" }] },
            ],
          },
        ],
      },
      "https://site",
    );
    expect(docs[0].body).toContain("- new:");
    expect(docs[0].body).not.toContain("- old:");
  });
});

describe("packageDocsPruneOk", () => {
  it("is false when any entry is skipped for a missing id", () => {
    const docs = buildPackageDocs(liveShapeFixture, "https://site");
    expect(docs.length).toBe(1);
    expect(packageDocsPruneOk(liveShapeFixture, docs)).toBe(false);
  });

  it("is false when zero valid docs result", () => {
    expect(packageDocsPruneOk({ packages: [] }, [])).toBe(false);
    expect(packageDocsPruneOk({ packages: [{ displayName: "no id" }] }, [])).toBe(false);
  });

  it("is true when every entry has an id and at least one doc is built", () => {
    const catalog = {
      packages: [
        {
          packageId: "Elsa.Http",
          latestVersion: "3.9.0",
          source: { name: "NuGet" },
          versions: [{ version: "3.9.0", features: [] }],
        },
      ],
    };
    const docs = buildPackageDocs(catalog, "https://site");
    expect(packageDocsPruneOk(catalog, docs)).toBe(true);
  });
});
