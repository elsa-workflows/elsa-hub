import { describe, it, expect } from "vitest";
import {
  buildFeatureIndex,
  resolveClosure,
  applyClosure,
} from "@/lib/runtime-builder/dependencies";
import type { CatalogV2, SelectedPackage } from "@/lib/runtime-builder/types-v2";

function pkg(
  id: string,
  features: Array<{
    id: string;
    deps?: Array<{ featureId: string; optional?: boolean }>;
  }>,
): CatalogV2["packages"][number] {
  return {
    id,
    displayName: id,
    version: "1.0.0",
    versions: ["1.0.0"],
    licenseTier: "OSS",
    stability: "Stable",
    category: "Test",
    features: features.map((f) => ({
      id: f.id,
      displayName: f.id,
      settings: [],
      dependencies: f.deps?.map((d) => ({
        featureId: d.featureId,
        optional: Boolean(d.optional),
      })),
    })),
  };
}

function selected(packageId: string, sel: string[] = []): SelectedPackage {
  return { packageId, version: "1.0.0", selectedFeatures: sel, settings: {} };
}

describe("dependency resolver", () => {
  it("builds a featureId -> packageId index", () => {
    const catalog: CatalogV2 = {
      packages: [pkg("A", [{ id: "fa" }]), pkg("B", [{ id: "fb" }])],
      infrastructureProviders: [],
    };
    const idx = buildFeatureIndex(catalog);
    expect(idx.get("fa")?.packageId).toBe("A");
    expect(idx.get("fb")?.packageId).toBe("B");
  });

  it("pulls in a single-hop required package via a feature dep", () => {
    const catalog: CatalogV2 = {
      packages: [
        pkg("A", [{ id: "fa", deps: [{ featureId: "fb" }] }]),
        pkg("B", [{ id: "fb" }]),
      ],
      infrastructureProviders: [],
    };
    const out = applyClosure(catalog, [selected("A", ["fa"])]);
    expect(out.map((p) => p.packageId).sort()).toEqual(["A", "B"]);
    const b = out.find((p) => p.packageId === "B")!;
    expect(b.autoAdded).toBe(true);
    expect(b.selectedFeatures).toContain("fb");
  });

  it("follows a multi-hop chain A -> B -> C", () => {
    const catalog: CatalogV2 = {
      packages: [
        pkg("A", [{ id: "fa", deps: [{ featureId: "fb" }] }]),
        pkg("B", [{ id: "fb", deps: [{ featureId: "fc" }] }]),
        pkg("C", [{ id: "fc" }]),
      ],
      infrastructureProviders: [],
    };
    const out = applyClosure(catalog, [selected("A", ["fa"])]);
    expect(out.map((p) => p.packageId).sort()).toEqual(["A", "B", "C"]);
  });

  it("terminates on cycles", () => {
    const catalog: CatalogV2 = {
      packages: [
        pkg("A", [{ id: "fa", deps: [{ featureId: "fb" }] }]),
        pkg("B", [{ id: "fb", deps: [{ featureId: "fa" }] }]),
      ],
      infrastructureProviders: [],
    };
    const { packageIds } = resolveClosure(catalog, [selected("A", ["fa"])]);
    expect(Array.from(packageIds).sort()).toEqual(["A", "B"]);
  });

  it("ignores optional dependencies", () => {
    const catalog: CatalogV2 = {
      packages: [
        pkg("A", [{ id: "fa", deps: [{ featureId: "fb", optional: true }] }]),
        pkg("B", [{ id: "fb" }]),
      ],
      infrastructureProviders: [],
    };
    const out = applyClosure(catalog, [selected("A", ["fa"])]);
    expect(out.map((p) => p.packageId)).toEqual(["A"]);
  });

  it("prunes orphan auto-added packages, keeps user-selected ones", () => {
    const catalog: CatalogV2 = {
      packages: [
        pkg("A", [{ id: "fa", deps: [{ featureId: "fb" }] }]),
        pkg("B", [{ id: "fb" }]),
        pkg("C", [{ id: "fc" }]),
      ],
      infrastructureProviders: [],
    };
    // User adds A (pulls in B) and explicitly adds C.
    let state = applyClosure(catalog, [selected("A", ["fa"]), selected("C")]);
    expect(state.map((p) => p.packageId).sort()).toEqual(["A", "B", "C"]);
    // User removes A. B should be pruned (auto), C stays.
    state = applyClosure(
      catalog,
      state.filter((p) => p.packageId !== "A"),
    );
    expect(state.map((p) => p.packageId).sort()).toEqual(["C"]);
  });

  it("does not auto-tick features inside a freshly user-added package", () => {
    const catalog: CatalogV2 = {
      packages: [pkg("A", [{ id: "fa" }, { id: "fa2" }])],
      infrastructureProviders: [],
    };
    const out = applyClosure(catalog, [selected("A")]);
    expect(out[0].selectedFeatures).toEqual([]);
  });

  it("skips unknown featureIds without throwing", () => {
    const catalog: CatalogV2 = {
      packages: [pkg("A", [{ id: "fa", deps: [{ featureId: "ghost" }] }])],
      infrastructureProviders: [],
    };
    const out = applyClosure(catalog, [selected("A", ["fa"])]);
    expect(out.map((p) => p.packageId)).toEqual(["A"]);
  });
});
