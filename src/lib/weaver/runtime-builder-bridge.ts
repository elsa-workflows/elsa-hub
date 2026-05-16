// Applies weaver tool intents to the Runtime Builder Zustand store.
// All entry points return a human-readable result for the chat UI.

import { useRuntimeBuilder } from "@/lib/runtime-builder/store";
import type { WeaverIntent } from "./intents";
import type { CatalogV2, InfraKind, Strategy } from "@/lib/runtime-builder/types-v2";

export interface ApplyResult {
  ok: boolean;
  message: string;
}

export function applyRbIntent(
  intent: WeaverIntent,
  catalog: CatalogV2 | null,
): ApplyResult {
  const store = useRuntimeBuilder.getState();

  switch (intent.kind) {
    case "rb.addPackage": {
      const pkg = catalog?.packages.find((p) => p.id === intent.packageId);
      if (!pkg) return { ok: false, message: `Unknown package: ${intent.packageId}` };
      const already = store.state.selectedPackages.some(
        (p) => p.packageId === intent.packageId,
      );
      if (already) return { ok: true, message: `${pkg.id} already in build.` };
      const version = pkg.versions[0] ?? "latest";
      store.togglePackage(intent.packageId, version);
      return { ok: true, message: `Added ${pkg.id}@${version}.` };
    }
    case "rb.removePackage": {
      const exists = store.state.selectedPackages.find(
        (p) => p.packageId === intent.packageId,
      );
      if (!exists) return { ok: true, message: `${intent.packageId} was not in build.` };
      store.togglePackage(intent.packageId, exists.version);
      return { ok: true, message: `Removed ${intent.packageId}.` };
    }
    case "rb.toggleFeature": {
      const sel = store.state.selectedPackages.find(
        (p) => p.packageId === intent.packageId,
      );
      if (!sel)
        return { ok: false, message: `Package ${intent.packageId} not selected.` };
      const isEnabled = sel.selectedFeatures.includes(intent.featureId);
      if (isEnabled === intent.enabled)
        return {
          ok: true,
          message: `Feature ${intent.featureId} already ${intent.enabled ? "on" : "off"}.`,
        };
      store.toggleFeature(intent.packageId, intent.featureId);
      return {
        ok: true,
        message: `${intent.enabled ? "Enabled" : "Disabled"} ${intent.featureId} on ${intent.packageId}.`,
      };
    }
    case "rb.setFeatureSetting": {
      store.setFeatureSetting(
        intent.packageId,
        intent.featureId,
        intent.name,
        intent.value,
      );
      return { ok: true, message: `Set ${intent.name} on ${intent.featureId}.` };
    }
    case "rb.selectInfrastructure": {
      const provider = catalog?.infrastructureProviders.find((p) => p.id === intent.providerId);
      if (!provider)
        return { ok: false, message: `Unknown provider: ${intent.providerId}` };
      store.setInfrastructure(
        intent.kindOf as InfraKind,
        provider.id,
        provider.strategy as Strategy,
      );
      return {
        ok: true,
        message: `Selected ${provider.displayName} for ${intent.kindOf}.`,
      };
    }
    case "rb.autoFillInfrastructure":
      return { ok: true, message: "Trigger auto-fill from the Infrastructure step." };
    case "rb.validate":
      return { ok: true, message: "Open the Validate step to run checks." };
    case "rb.generateBundle":
      return { ok: true, message: "Open the Bundle step to generate the deployable bundle." };
    case "navigate":
      return { ok: true, message: `Navigated to ${intent.path}.` };
    default:
      return { ok: false, message: "Unsupported action." };
  }
}

export function snapshotRuntimeBuilder() {
  const s = useRuntimeBuilder.getState().state;
  return {
    advancedMode: s.advancedMode,
    selectedPackages: s.selectedPackages.map((p) => ({
      packageId: p.packageId,
      version: p.version,
      features: p.selectedFeatures,
    })),
    infrastructureSelections: s.infrastructureSelections.map((i) => ({
      kind: i.kind,
      providerId: i.providerId,
      strategy: i.strategy,
    })),
  };
}
