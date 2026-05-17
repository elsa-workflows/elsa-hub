// Applies weaver tool intents to the Runtime Builder Zustand store.
// All entry points return a human-readable result for the chat UI and
// emit start/applied/error events to the visible intent log so users can
// see Weaver activity inside the builder in real time.

import { useRuntimeBuilder } from "@/lib/runtime-builder/store";
import type { WeaverIntent } from "./intents";
import type { CatalogV2, InfraKind, Strategy } from "@/lib/runtime-builder/types-v2";
import { logIntent, updateIntentLog } from "./intent-log";

export interface ApplyResult {
  ok: boolean;
  message: string;
}

function startMessage(intent: WeaverIntent): string {
  switch (intent.kind) {
    case "rb.addPackage":
      return `Adding package ${intent.packageId}…`;
    case "rb.removePackage":
      return `Removing package ${intent.packageId}…`;
    case "rb.toggleFeature":
      return `${intent.enabled ? "Enabling" : "Disabling"} ${intent.featureId} on ${intent.packageId}…`;
    case "rb.setFeatureSetting":
      return `Setting ${intent.name} = ${String(intent.value)} on ${intent.featureId}…`;
    case "rb.selectInfrastructure":
      return `Selecting ${intent.providerId} for ${intent.kindOf}…`;
    case "rb.selectImage":
      return `Selecting image ${intent.slug}${intent.tag ? `:${intent.tag}` : ""}…`;
    case "rb.autoFillInfrastructure":
      return "Auto-filling infrastructure…";
    case "rb.validate":
      return "Validating build…";
    case "rb.generateBundle":
      return "Generating bundle…";
    case "navigate":
      return `Navigating to ${intent.path}…`;
    default:
      return "Applying intent…";
  }
}

export function applyRbIntent(
  intent: WeaverIntent,
  catalog: CatalogV2 | null,
): ApplyResult {
  const logId = logIntent({
    kind: intent.kind,
    phase: "start",
    message: startMessage(intent),
  });

  const finish = (result: ApplyResult): ApplyResult => {
    updateIntentLog(logId, {
      phase: result.ok ? "applied" : "error",
      message: result.message,
    });
    return result;
  };

  const store = useRuntimeBuilder.getState();

  switch (intent.kind) {
    case "rb.addPackage": {
      if (!catalog) return finish({ ok: false, message: "Catalog not loaded yet." });
      const pkg = catalog.packages.find((p) => p.id === intent.packageId);
      if (!pkg) return finish({ ok: false, message: `Unknown package: ${intent.packageId}` });
      const already = store.state.selectedPackages.some(
        (p) => p.packageId === intent.packageId,
      );
      if (already) return finish({ ok: true, message: `${pkg.id} already in build.` });
      const version = pkg.version ?? pkg.versions?.[0] ?? "latest";
      store.togglePackage(intent.packageId, version, catalog);
      return finish({ ok: true, message: `Added ${pkg.id}@${version}.` });
    }
    case "rb.removePackage": {
      const exists = store.state.selectedPackages.find(
        (p) => p.packageId === intent.packageId,
      );
      if (!exists) return finish({ ok: true, message: `${intent.packageId} was not in build.` });
      store.togglePackage(intent.packageId, exists.version, catalog ?? undefined);
      return finish({ ok: true, message: `Removed ${intent.packageId}.` });
    }
    case "rb.toggleFeature": {
      if (!catalog) return finish({ ok: false, message: "Catalog not loaded yet." });
      const pkg = catalog.packages.find((p) => p.id === intent.packageId);
      if (!pkg) return finish({ ok: false, message: `Unknown package: ${intent.packageId}` });
      const sel = store.state.selectedPackages.find(
        (p) => p.packageId === intent.packageId,
      );
      const isEnabled = sel?.selectedFeatures.includes(intent.featureId) ?? false;
      if (isEnabled === intent.enabled)
        return finish({
          ok: true,
          message: `Feature ${intent.featureId} already ${intent.enabled ? "on" : "off"}.`,
        });
      store.toggleCapability(intent.packageId, intent.featureId, catalog);
      return finish({
        ok: true,
        message: `${intent.enabled ? "Enabled" : "Disabled"} ${intent.featureId} on ${intent.packageId}.`,
      });
    }
    case "rb.setFeatureSetting": {
      if (catalog) {
        const sel = store.state.selectedPackages.find(
          (p) => p.packageId === intent.packageId,
        );
        const hasFeature = sel?.selectedFeatures.includes(intent.featureId);
        if (!sel || !hasFeature) {
          const pkg = catalog.packages.find((p) => p.id === intent.packageId);
          if (!pkg)
            return finish({ ok: false, message: `Unknown package: ${intent.packageId}` });
          store.toggleCapability(intent.packageId, intent.featureId, catalog);
        }
      }
      store.setFeatureSetting(
        intent.packageId,
        intent.featureId,
        intent.name,
        intent.value,
      );
      return finish({ ok: true, message: `Set ${intent.name} on ${intent.featureId}.` });
    }
    case "rb.selectInfrastructure": {
      const provider = catalog?.infrastructureProviders.find((p) => p.id === intent.providerId);
      if (!provider)
        return finish({ ok: false, message: `Unknown provider: ${intent.providerId}` });
      store.setInfrastructure(
        intent.kindOf as InfraKind,
        provider.id,
        provider.strategy as Strategy,
      );
      return finish({
        ok: true,
        message: `Selected ${provider.displayName} for ${intent.kindOf}.`,
      });
    }
    case "rb.autoFillInfrastructure":
      return finish({ ok: true, message: "Trigger auto-fill from the Infrastructure step." });
    case "rb.validate":
      return finish({ ok: true, message: "Open the Validate step to run checks." });
    case "rb.generateBundle":
      return finish({ ok: true, message: "Open the Bundle step to generate the deployable bundle." });
    case "navigate":
      return finish({ ok: true, message: `Navigated to ${intent.path}.` });
    default:
      return finish({ ok: false, message: "Unsupported action." });
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
