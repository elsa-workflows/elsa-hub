import {
  CLOUD_LIMIT_CODE,
  CLOUD_REQUIRED_CAPABILITIES,
  CLOUD_SUPPORTED_CONTRACT_VERSION,
  type CloudActivityItem,
  type CloudAvailableRelease,
  type CloudDeleteConfirmation,
  type CloudEngineActionDecision,
  type CloudEngineOverview,
  type CloudEngineSummary,
  type CloudLastOperation,
  type CloudLaunchProfile,
  type CloudOnboardingOptions,
  type CloudOperation,
  type CloudOperationProgress,
  type CloudProvisioningActivity,
  type CloudProvisioningProgress,
  type CloudProvisioningStage,
  type CloudReleaseOption,
  type CloudStudioHandoff,
  type CloudWorkspace,
  isGuid,
} from "./cloud-types.ts";

const CONTROL_TIMEOUT_MS = 15_000;

export type ControlCall = {
  method: "GET" | "POST" | "PATCH";
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  action?: string;
};

export function logControlStatus(status: number, action: string | undefined) {
  console.info(`control_status=${status} action=${action ?? "unknown"}`);
}

export type ControlResult = {
  ok: true;
  status: number;
  body: unknown;
  etag?: string;
} | {
  ok: false;
  kind: "updating" | "forbidden" | "not_found" | "invalid" | "limit" | "unauthorized";
  code?: string;
  staleSession?: "hub" | "cloud" | "both";
  currentInstances?: number;
  maxInstances?: number;
};

export type ControlFetch = (
  call: ControlCall,
  accessToken: string,
) => Promise<ControlResult>;

export function createControlFetch(
  env: { get: (key: string) => string | undefined } = Deno.env,
  fetchImpl: typeof fetch = fetch,
): ControlFetch {
  return async (call, accessToken) => {
    const baseUrl = (env.get("ELSA_CONTROL_API_BASE_URL") ?? "").replace(/\/+$/, "");
    if (!baseUrl) {
      logControlStatus(0, call.action);
      return { ok: false, kind: "updating" };
    }

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), CONTROL_TIMEOUT_MS);
    try {
      const res = await fetchImpl(`${baseUrl}${call.path}`, {
        method: call.method,
        headers: controlHeaders(call, accessToken, env),
        body: call.body !== undefined ? JSON.stringify(call.body) : undefined,
        signal: ctrl.signal,
      });
      logControlStatus(res.status, call.action);
      const text = await res.text();
      let parsed: unknown = null;
      if (text) {
        try {
          parsed = JSON.parse(text);
        } catch {
          return { ok: false, kind: "updating" };
        }
      }
      if (res.status === 401) {
        const problem = problemFrom(parsed);
        if (problem?.code?.startsWith("cloud.account-link.")) {
          return {
            ok: false,
            kind: "unauthorized",
            code: problem.code,
            staleSession: problem.staleSession,
          };
        }
        return { ok: false, kind: "updating" };
      }
      if (res.status === 503 || res.status >= 500) {
        return { ok: false, kind: "updating" };
      }
      if (res.status === 403) return { ok: false, kind: "forbidden" };
      if (res.status === 404) return { ok: false, kind: "not_found" };
      const problem = problemFrom(parsed);
      if (problem?.code === CLOUD_LIMIT_CODE) {
        return {
          ok: false,
          kind: "limit",
          code: CLOUD_LIMIT_CODE,
          currentInstances: problem.currentInstances,
          maxInstances: problem.maxInstances,
        };
      }
      if (res.status === 400 || res.status === 409 || res.status === 412 || res.status === 422 || res.status === 428) {
        return { ok: false, kind: "invalid", code: problem?.code };
      }
      if (res.status < 200 || res.status >= 300) {
        return { ok: false, kind: "updating" };
      }
      return {
        ok: true,
        status: res.status,
        body: parsed,
        etag: res.headers.get("ETag") ?? undefined,
      };
    } catch {
      logControlStatus(0, call.action);
      return { ok: false, kind: "updating" };
    } finally {
      clearTimeout(timeout);
    }
  };
}

const BFF_CREDENTIAL_HEADER = "X-Elsa-Bff-Credential";

// The BFF credential only selects Control's rate-limit partition for Hub calls.
// It comes from the operator-set function secret, never from a caller, and its
// value must never be logged or returned.
function controlHeaders(
  call: ControlCall,
  accessToken: string,
  env: { get: (key: string) => string | undefined },
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
    ...(call.body !== undefined ? { "Content-Type": "application/json" } : {}),
  };
  for (const [name, value] of Object.entries(call.headers ?? {})) {
    if (name.toLowerCase() !== BFF_CREDENTIAL_HEADER.toLowerCase()) headers[name] = value;
  }
  const credential = (env.get("ELSA_CONTROL_BFF_CREDENTIAL") ?? "").trim();
  if (credential) headers[BFF_CREDENTIAL_HEADER] = credential;
  return headers;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function problemFrom(body: unknown): {
  code?: string;
  staleSession?: "hub" | "cloud" | "both";
  currentInstances?: number;
  maxInstances?: number;
} | null {
  const record = asRecord(body);
  if (!record) return null;
  const extensions = asRecord(record.extensions);
  const code = asString(record.code) ?? asString(extensions?.code) ?? undefined;
  const stale = asString(record.staleSession) ?? asString(extensions?.staleSession);
  return {
    code,
    staleSession: stale === "hub" || stale === "cloud" || stale === "both" ? stale : undefined,
    currentInstances: asNumber(record.currentInstances),
    maxInstances: asNumber(record.maxInstances),
  };
}

export function normalizeCompatibility(body: unknown): {
  contractVersion: number;
  capabilities: string[];
} | null {
  const record = asRecord(body);
  if (!record) return null;
  const contractVersion = record.contractVersion;
  if (typeof contractVersion !== "number" || !Number.isInteger(contractVersion)) {
    return null;
  }
  if (!Array.isArray(record.capabilities)) return null;
  const capabilities = record.capabilities.filter((item): item is string =>
    typeof item === "string"
  );
  if (capabilities.length !== record.capabilities.length) return null;
  return { contractVersion, capabilities };
}

export function isCompatibleControl(
  body: unknown,
  required: readonly string[] = CLOUD_REQUIRED_CAPABILITIES,
): boolean {
  const normalized = normalizeCompatibility(body);
  if (!normalized) return false;
  if (normalized.contractVersion !== CLOUD_SUPPORTED_CONTRACT_VERSION) return false;
  return required.every((capability) =>
    normalized.capabilities.includes(capability)
  );
}

export function normalizeBootstrap(body: unknown): {
  organizationId: string;
  workspaceId: string;
} | null {
  const record = asRecord(body);
  if (!record) return null;
  const organizationId = asString(record.organizationId);
  const workspaceId = asString(record.workspaceId);
  if (!isGuid(organizationId) || !isGuid(workspaceId)) return null;
  return { organizationId, workspaceId };
}

export function normalizeWorkspaces(body: unknown): CloudWorkspace[] | null {
  const record = asRecord(body);
  if (!record || !Array.isArray(record.workspaces)) return null;
  const workspaces: CloudWorkspace[] = [];
  for (const item of record.workspaces) {
    const workspace = normalizeWorkspace(item);
    if (!workspace) return null;
    workspaces.push(workspace);
  }
  return workspaces;
}

export function normalizeWorkspace(value: unknown): CloudWorkspace | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = asString(record.id);
  const organizationId = asString(record.organizationId);
  if (!isGuid(id) || !isGuid(organizationId)) return null;
  return {
    id,
    name: asString(record.name) ?? id,
    kind: asString(record.kind) ?? "personal",
    role: asString(record.role) ?? "member",
    organizationId,
    organizationName: asString(record.organizationName) ?? "",
    organizationRole: asString(record.organizationRole) ?? "member",
  };
}

function releaseFrom(record: Record<string, unknown>): string | null {
  const current = asRecord(record.currentResolvedRelease);
  if (current) {
    return asString(current.version) ?? asString(current.releaseLine);
  }
  const release = asRecord(record.release);
  if (release) {
    return asString(release.version) ?? asString(release.releaseLine);
  }
  return null;
}

function engineIdFrom(record: Record<string, unknown>): string | null {
  return asString(record.instanceId) ?? asString(record.id);
}

export function normalizeEngines(body: unknown): CloudEngineSummary[] | null {
  const record = asRecord(body);
  if (!record || !Array.isArray(record.items)) return null;
  const engines: CloudEngineSummary[] = [];
  for (const item of record.items) {
    const engine = normalizeEngineSummary(item);
    if (!engine) return null;
    engines.push(engine);
  }
  return engines;
}

export function normalizeEngineSummary(value: unknown): CloudEngineSummary | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = engineIdFrom(record);
  const name = asString(record.name);
  const slug = asString(record.slug);
  if (!isGuid(id) || !name || !slug) return null;
  return {
    id,
    name,
    slug,
    status: asString(record.observedLifecycle) ?? asString(record.status) ?? "Unknown",
    release: releaseFrom(record),
  };
}

function actionDecision(value: unknown): CloudEngineActionDecision {
  const record = asRecord(value);
  if (!record) return { allowed: false, reasonCode: null };
  return {
    allowed: Boolean(record.allowed ?? record.Allowed),
    reasonCode: asString(record.reasonCode) ?? asString(record.ReasonCode),
  };
}

export function normalizeEngineOverview(
  value: unknown,
  etag?: string,
): CloudEngineOverview | null {
  const record = asRecord(value);
  if (!record) return null;
  const summarySource = asRecord(record.summary) ?? record;
  const summary = normalizeEngineSummary({
    ...summarySource,
    currentResolvedRelease: record.currentResolvedRelease,
    release: record.release,
  });
  if (!summary) return null;
  const healthRecord = asRecord(record.health);
  const health = healthRecord
    ? asString(healthRecord.status) ?? "Unknown"
    : asString(record.health) ?? "Unknown";
  const allowed = asRecord(record.allowedActions);
  const versionValue = summarySource.version ?? record.version;
  const version = typeof versionValue === "number" && Number.isInteger(versionValue)
    ? versionValue
    : null;
  return {
    ...summary,
    health,
    canOpen: Boolean(summarySource.canOpen ?? record.canOpen),
    version,
    etag: etag ?? (version !== null ? `"${version}"` : null),
    organizationId: asString(summarySource.organizationId) ?? asString(record.organizationId),
    audience: asString(summarySource.audience) ?? asString(record.audience),
    redirectUri: asString(summarySource.redirectUri) ?? asString(record.redirectUri),
    unavailableReason: asString(summarySource.unavailableReason) ?? asString(record.unavailableReason),
    unavailableReasonCode: asString(summarySource.unavailableReasonCode)
      ?? asString(record.unavailableReasonCode),
    activeOperation: normalizeOverviewOperation(record.activeOperation),
    lastOperation: normalizeLastOperation(record.lastOperation),
    allowedActions: {
      restart: actionDecision(allowed?.restart ?? allowed?.Restart),
      applyRelease: actionDecision(allowed?.applyRelease ?? allowed?.ApplyRelease),
      open: actionDecision(allowed?.open ?? allowed?.Open),
      delete: actionDecision(allowed?.delete ?? allowed?.Delete),
    },
  };
}

function normalizeOperationProgress(value: unknown): CloudOperationProgress | null {
  const record = asRecord(value);
  if (!record) return null;
  const attemptNumber = asNumber(record.attemptNumber);
  return {
    phase: asString(record.phase),
    attemptedStep: asString(record.attemptedStep),
    attemptNumber: attemptNumber ?? null,
    attemptStartedAt: asString(record.attemptStartedAt),
  };
}

function normalizeOverviewOperation(value: unknown): CloudOperation | null {
  const record = asRecord(value);
  if (!record) return null;
  const base = normalizeOperation(record);
  if (!base) return null;
  return {
    ...base,
    acceptedAt: asString(record.acceptedAt),
    startedAt: asString(record.startedAt),
    completedAt: asString(record.completedAt),
    requiresHumanAt: asString(record.requiresHumanAt),
    progress: normalizeOperationProgress(record.progress),
  };
}

function normalizeLastOperation(value: unknown): CloudLastOperation | null {
  const record = asRecord(value);
  if (!record) return null;
  const action = asString(record.action);
  const state = asString(record.state);
  if (!action || !state) return null;
  return {
    action,
    state,
    completedAt: asString(record.completedAt),
    failureCode: asString(record.failureCode),
  };
}

function normalizeReleaseOption(value: unknown): CloudReleaseOption | null {
  const record = asRecord(value);
  if (!record) return null;
  const distributionId = asString(record.distributionId);
  const releaseLine = asString(record.releaseLine);
  const version = asString(record.version);
  const channel = asString(record.channel);
  const topologyId = asString(record.topologyId);
  if (!distributionId || !releaseLine || !version || !channel || !topologyId) return null;
  return {
    distributionId,
    releaseLine,
    version,
    channel,
    topologyId,
    previewManifestDigest: asString(record.previewManifestDigest) ?? asString(record.manifestDigest),
  };
}

function normalizeLaunchProfile(value: unknown): CloudLaunchProfile | null {
  const record = asRecord(value);
  if (!record) return null;
  const targetMode = asString(record.targetMode);
  const regionCode = asString(record.regionCode);
  const isolationProfile = asString(record.isolationProfile);
  const capacityProfile = asString(record.capacityProfile);
  const networkOutcome = asString(record.networkOutcome);
  const domainOutcome = asString(record.domainOutcome);
  if (!targetMode || !regionCode || !isolationProfile || !capacityProfile || !networkOutcome || !domainOutcome) {
    return null;
  }
  return {
    name: asString(record.name) ?? targetMode,
    description: asString(record.description) ?? "",
    targetMode,
    regionCode,
    isolationProfile,
    capacityProfile,
    networkOutcome,
    domainOutcome,
  };
}

export function normalizeOnboardingOptions(body: unknown): CloudOnboardingOptions | null {
  const record = asRecord(body);
  if (!record) return null;
  const launchProfile = normalizeLaunchProfile(record.launchProfile);
  if (!launchProfile) return null;
  const releases: CloudReleaseOption[] = [];
  if (Array.isArray(record.releases)) {
    for (const item of record.releases) {
      const release = normalizeReleaseOption(item);
      if (!release) return null;
      releases.push(release);
    }
  }
  const previewReleases: CloudReleaseOption[] = [];
  if (Array.isArray(record.previewReleases)) {
    for (const item of record.previewReleases) {
      const release = normalizeReleaseOption(item);
      if (!release) return null;
      previewReleases.push(release);
    }
  }
  return { releases, previewReleases, launchProfile };
}

export function normalizeAcceptedCreate(body: unknown): {
  engine: CloudEngineSummary;
  operation: CloudOperation;
} | null {
  const record = asRecord(body);
  if (!record) return null;
  const engine = normalizeEngineSummary(record.instance ?? record);
  const operation = normalizeOperation(record.operation ?? record);
  if (!engine || !operation) return null;
  return { engine, operation };
}

export function normalizeOperation(value: unknown): CloudOperation | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = asString(record.id) ?? asString(record.operationId);
  const state = asString(record.state);
  if (!isGuid(id) || !state) return null;
  const acceptedAt = asString(record.acceptedAt);
  const completedAt = asString(record.completedAt);
  return {
    id,
    action: asString(record.action) ?? "Unknown",
    state,
    ...(acceptedAt ? { acceptedAt } : {}),
    ...(completedAt ? { completedAt } : {}),
  };
}

export function normalizeProvisioningProgress(body: unknown): CloudProvisioningProgress | null {
  const record = asRecord(body);
  if (!record) return null;
  const state = asString(record.state);
  if (!state) return null;
  const stages: CloudProvisioningStage[] = [];
  if (Array.isArray(record.stages)) {
    for (const item of record.stages) {
      const stage = asRecord(item);
      if (!stage) return null;
      const code = asString(stage.code);
      const status = asString(stage.status);
      if (!code || !status) return null;
      stages.push({
        code,
        status,
        startedAt: asString(stage.startedAt),
        completedAt: asString(stage.completedAt),
      });
    }
  }
  const activity: CloudProvisioningActivity[] = [];
  if (Array.isArray(record.activity)) {
    for (const item of record.activity) {
      const row = asRecord(item);
      if (!row) continue;
      const sequence = typeof row.sequence === "number" && Number.isInteger(row.sequence)
        ? row.sequence
        : null;
      if (sequence === null) continue;
      activity.push({
        sequence,
        messageCode: asString(row.messageCode),
      });
    }
  }
  const attemptNumber = asNumber(record.attemptNumber);
  return {
    state,
    currentStage: asString(record.currentStage),
    startedAt: asString(record.startedAt),
    lastUpdatedAt: asString(record.lastUpdatedAt),
    completedAt: asString(record.completedAt),
    diagnosticCode: asString(record.diagnosticCode),
    phase: asString(record.phase),
    attemptedStep: asString(record.attemptedStep),
    attemptNumber: attemptNumber ?? null,
    attemptStartedAt: asString(record.attemptStartedAt),
    stages,
    activity,
  };
}

export function normalizeActivity(body: unknown): { items: CloudActivityItem[]; hasMore: boolean } | null {
  const record = asRecord(body);
  if (!record || !Array.isArray(record.items)) return null;
  const items: CloudActivityItem[] = [];
  for (const item of record.items) {
    const row = asRecord(item);
    if (!row) return null;
    const sequence = typeof row.sequence === "number" ? row.sequence : null;
    const eventType = asString(row.eventType);
    const occurredAt = asString(row.occurredAt);
    if (sequence === null || !eventType || !occurredAt) return null;
    items.push({
      sequence,
      eventType,
      occurredAt,
      action: asString(row.action),
      diagnosticCode: asString(row.diagnosticCode),
      severity: asString(row.severity) ?? "Informational",
      message: asString(row.message),
    });
  }
  return { items, hasMore: Boolean(record.hasMore) };
}

export function normalizeAvailableReleases(body: unknown): CloudAvailableRelease[] | null {
  const record = asRecord(body);
  const source = Array.isArray(record?.items) ? record!.items : Array.isArray(body) ? body : null;
  if (!source) return null;
  const releases: CloudAvailableRelease[] = [];
  for (const item of source) {
    const row = asRecord(item);
    if (!row) return null;
    const releaseLine = asString(row.releaseLine);
    const version = asString(row.version);
    const channel = asString(row.channel);
    if (!releaseLine || !version || !channel) return null;
    releases.push({
      releaseLine,
      version,
      channel,
      changeKind: asString(row.changeKind) ?? "unknown",
    });
  }
  return releases;
}

export function normalizeDeleteConfirmation(body: unknown): CloudDeleteConfirmation | null {
  const record = asRecord(body);
  if (!record) return null;
  const id = asString(record.id);
  const expiresAt = asString(record.expiresAt);
  if (!isGuid(id) || !expiresAt) return null;
  const notice = asRecord(record.billingNotice);
  return {
    id,
    expiresAt,
    billingNotice: notice && asString(notice.code) && asString(notice.message)
      ? { code: asString(notice.code)!, message: asString(notice.message)! }
      : null,
  };
}

export function normalizeStudioHandoff(body: unknown): CloudStudioHandoff | null {
  const record = asRecord(body);
  if (!record) return null;
  const token = asString(record.token);
  const tokenType = asString(record.tokenType);
  const audience = asString(record.audience);
  const redirectUri = asString(record.redirectUri);
  const issuedAt = asString(record.issuedAt);
  const expiresAt = asString(record.expiresAt);
  if (!token || !tokenType || !audience || !redirectUri || !issuedAt || !expiresAt) return null;
  return { token, tokenType, audience, redirectUri, issuedAt, expiresAt };
}
