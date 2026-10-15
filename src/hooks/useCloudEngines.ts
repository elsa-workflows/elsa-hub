import { useQuery } from "@tanstack/react-query";
import { cloudClient } from "@/lib/cloudClient/client";
import {
  isCloudBffError,
  isCloudUpdating,
  type CloudBffResponse,
  type CloudEngineSummary,
} from "@/lib/cloudClient/contract";

export type CloudEngineListView =
  | { kind: "loading" }
  | { kind: "updating"; message: string }
  | { kind: "empty" }
  | { kind: "list"; engines: CloudEngineSummary[] }
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

export function cloudEngineListView(
  result: CloudBffResponse | undefined,
  isPending: boolean,
): CloudEngineListView {
  if (isPending || result === undefined) {
    return { kind: "loading" };
  }
  if (isCloudUpdating(result)) {
    return { kind: "updating", message: result.error };
  }
  if (isCloudBffError(result)) {
    return { kind: "error", message: result.error };
  }
  if ("engines" in result) {
    if (result.state === "empty" || result.engines.length === 0) {
      return { kind: "empty" };
    }
    return { kind: "list", engines: result.engines };
  }
  return { kind: "error", message: "Unexpected cloud-bff response." };
}

export async function fetchCloudEngines(): Promise<CloudBffResponse> {
  const boot = await cloudClient.invoke({ action: "bootstrap" });
  if (!boot.ok) return boot;
  if (!isBootstrapReady(boot)) {
    return { ok: false, code: "invalid_request", error: "Unexpected bootstrap response." };
  }
  return cloudClient.invoke({ action: "listEngines", workspaceId: boot.workspaceId });
}

export function useCloudEngines() {
  const query = useQuery({
    queryKey: ["cloud", "engines"],
    queryFn: fetchCloudEngines,
    staleTime: 30_000,
    retry: false,
  });

  return {
    ...query,
    view: cloudEngineListView(query.data, query.isPending),
  };
}
