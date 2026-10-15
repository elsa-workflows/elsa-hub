import {
  CLOUD_REQUIRED_CAPABILITIES,
  CLOUD_SUPPORTED_CONTRACT_VERSION,
  type CloudEngineOverview,
  type CloudEngineSummary,
  type CloudWorkspace,
  isGuid,
} from "./cloud-types.ts";

const CONTROL_TIMEOUT_MS = 15_000;

export type ControlCall = {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
};

export type ControlResult = {
  ok: true;
  status: number;
  body: unknown;
} | {
  ok: false;
  kind: "updating" | "forbidden" | "not_found" | "invalid";
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
    if (!baseUrl) return { ok: false, kind: "updating" };

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), CONTROL_TIMEOUT_MS);
    try {
      const res = await fetchImpl(`${baseUrl}${call.path}`, {
        method: call.method,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
          ...(call.body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: call.body !== undefined ? JSON.stringify(call.body) : undefined,
        signal: ctrl.signal,
      });
      const text = await res.text();
      let parsed: unknown = null;
      if (text) {
        try {
          parsed = JSON.parse(text);
        } catch {
          return { ok: false, kind: "updating" };
        }
      }
      if (res.status === 401 || res.status === 503 || res.status >= 500) {
        return { ok: false, kind: "updating" };
      }
      if (res.status === 403) return { ok: false, kind: "forbidden" };
      if (res.status === 404) return { ok: false, kind: "not_found" };
      if (res.status === 400 || res.status === 409 || res.status === 422) {
        return { ok: false, kind: "invalid" };
      }
      if (res.status < 200 || res.status >= 300) {
        return { ok: false, kind: "updating" };
      }
      return { ok: true, status: res.status, body: parsed };
    } catch {
      return { ok: false, kind: "updating" };
    } finally {
      clearTimeout(timeout);
    }
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
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

export function isCompatibleControl(body: unknown): boolean {
  const normalized = normalizeCompatibility(body);
  if (!normalized) return false;
  if (normalized.contractVersion !== CLOUD_SUPPORTED_CONTRACT_VERSION) return false;
  return CLOUD_REQUIRED_CAPABILITIES.every((capability) =>
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

export function normalizeEngineOverview(value: unknown): CloudEngineOverview | null {
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
  return {
    ...summary,
    health,
    canOpen: Boolean(summarySource.canOpen ?? record.canOpen),
  };
}
