import { useQuery } from "@tanstack/react-query";
import { cloudClient } from "@/lib/cloudClient/client";
import {
  isCloudBffError,
  isCloudUpdating,
  type CloudBffResponse,
  type CloudEngineOverview,
} from "@/lib/cloudClient/contract";

export type CloudEngineOverviewView =
  | { kind: "loading" }
  | { kind: "updating"; message: string }
  | { kind: "ready"; engine: CloudEngineOverview }
  | { kind: "missing" }
  | { kind: "error"; message: string };

function isBootstrapReady(
  response: CloudBffResponse,
): response is Extract<CloudBffResponse, { ok: true; organizationId: string; workspaceId: string }> {
  return (
    response.ok === true &&
    "organizationId" in response &&
    "workspaceId" in response &&
    !("engines" in response)
  );
}

export function cloudEngineOverviewView(
  result: CloudBffResponse | undefined,
  isPending: boolean,
): CloudEngineOverviewView {
  if (isPending || result === undefined) {
    return { kind: "loading" };
  }
  if (isCloudUpdating(result)) {
    return { kind: "updating", message: result.error };
  }
  if (isCloudBffError(result)) {
    if (result.code === "not_found") return { kind: "missing" };
    return { kind: "error", message: result.error };
  }
  if ("engine" in result) {
    return { kind: "ready", engine: result.engine };
  }
  return { kind: "error", message: "Unexpected cloud-bff response." };
}

export async function fetchCloudEngineOverview(engineId: string): Promise<CloudBffResponse> {
  const boot = await cloudClient.invoke({ action: "bootstrap" });
  if (!boot.ok) return boot;
  if (!isBootstrapReady(boot)) {
    return { ok: false, code: "invalid_request", error: "Unexpected bootstrap response." };
  }
  return cloudClient.invoke({
    action: "engineOverview",
    workspaceId: boot.workspaceId,
    engineId,
  });
}

export function useCloudEngineOverview(engineId: string | undefined) {
  const query = useQuery({
    queryKey: ["cloud", "engines", engineId],
    queryFn: () => fetchCloudEngineOverview(engineId!),
    enabled: Boolean(engineId),
    staleTime: 30_000,
    retry: false,
  });

  return {
    ...query,
    view: cloudEngineOverviewView(query.data, query.isPending || !engineId),
  };
}
