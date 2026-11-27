/**
 * Control customer-overview shapes as Hub receives them after normalization.
 * Field values follow ManagedElsaInstanceCustomerProjection and
 * ManagedElsaInstanceOverviewEndpoints (observedLifecycle, unavailableReason /
 * unavailableReasonCode, health, lastOperation, activeOperation).
 *
 * The full golden set of raw Control bodies lands with #230 /
 * valence-works/elsa-control#1056.
 */
import type { CloudEngineOverview } from "@/lib/cloud/actions";

const ALLOWED = {
  restart: { allowed: false, reasonCode: "instance.unavailable" as string | null },
  applyRelease: { allowed: false, reasonCode: "instance.unavailable" as string | null },
  open: { allowed: false, reasonCode: "instance.unavailable" as string | null },
  delete: { allowed: false, reasonCode: "instance.unavailable" as string | null },
};

const base = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Test",
  slug: "test",
  release: "3.8.4",
  canOpen: false,
  version: 4,
  etag: '"4"',
  organizationId: "33333333-3333-4333-8333-333333333333",
  audience: "https://studio.example",
  redirectUri: "https://studio.example/handoff",
} as const;

/** Deleted engine: Control always sends instance.unavailable and the generic prose. */
export function controlDeletedOverview(overrides: Partial<CloudEngineOverview> = {}): CloudEngineOverview {
  return {
    ...base,
    status: "Deleted",
    health: "Unknown",
    unavailableReason: "This instance is not currently available.",
    unavailableReasonCode: "instance.unavailable",
    lastOperation: {
      action: "Delete",
      state: "Succeeded",
      completedAt: "2026-11-27T14:05:00.000Z",
      failureCode: null,
    },
    allowedActions: ALLOWED,
    ...overrides,
  };
}

/** Failed setup: lastOperation Create, Control forces health Unreachable. */
export function controlFailedSetupOverview(overrides: Partial<CloudEngineOverview> = {}): CloudEngineOverview {
  return {
    ...base,
    status: "Failed",
    health: "Unreachable",
    unavailableReason: "This instance failed. Refresh for the latest Control outcome, or recover it when it is safe.",
    unavailableReasonCode: "instance.failed",
    lastOperation: {
      action: "Create",
      state: "Failed",
      completedAt: "2026-11-27T13:00:00.000Z",
      failureCode: null,
      reasonCode: "provisioning.timeout.workload",
    },
    allowedActions: {
      ...ALLOWED,
      restart: { allowed: false, reasonCode: "instance.failed" },
    },
    ...overrides,
  };
}

/** Failed after Ready: lastOperation Restart (or any non-Create/Retry). Can still serve previous revision. */
export function controlFailedAfterReadyOverview(overrides: Partial<CloudEngineOverview> = {}): CloudEngineOverview {
  return {
    ...base,
    status: "Failed",
    health: "Unreachable",
    unavailableReason: "This instance failed. Refresh for the latest Control outcome, or recover it when it is safe.",
    unavailableReasonCode: "instance.failed",
    lastOperation: {
      action: "Restart",
      state: "Failed",
      completedAt: "2026-11-27T13:30:00.000Z",
      failureCode: null,
    },
    allowedActions: {
      ...ALLOWED,
      restart: { allowed: true, reasonCode: null },
    },
    ...overrides,
  };
}

/** Failed with no lastOperation at all. */
export function controlFailedWithoutOperationOverview(overrides: Partial<CloudEngineOverview> = {}): CloudEngineOverview {
  return {
    ...controlFailedAfterReadyOverview(),
    lastOperation: null,
    allowedActions: ALLOWED,
    ...overrides,
  };
}

/** Parked delete: Control sends a customer-safe operation code, not a Hub alias. */
export function controlParkedDeleteOverview(overrides: Partial<CloudEngineOverview> = {}): CloudEngineOverview {
  return {
    ...base,
    status: "RecoveryRequired",
    health: "Unknown",
    unavailableReason: "Deletion of this engine didn't finish on its own. Email hello@valence.works with reference 22222222-2222-4222-8222-222222222222 and we'll help during business hours.",
    unavailableReasonCode: "deletion.provider-cleanup-pending",
    activeOperation: {
      id: "22222222-2222-4222-8222-222222222222",
      action: "Delete",
      state: "RecoveryRequired",
      requiresHumanAt: "2026-11-27T13:40:00.000Z",
    },
    allowedActions: ALLOWED,
    ...overrides,
  };
}

/** EntitlementHeld delete. */
export function controlHeldDeleteOverview(overrides: Partial<CloudEngineOverview> = {}): CloudEngineOverview {
  return {
    ...base,
    status: "RecoveryRequired",
    health: "Unknown",
    unavailableReason: "This instance is not currently available.",
    unavailableReasonCode: "instance.recovery-required",
    activeOperation: {
      id: "22222222-2222-4222-8222-222222222222",
      action: "Delete",
      state: "EntitlementHeld",
    },
    allowedActions: ALLOWED,
    ...overrides,
  };
}
