import { useQuery } from "@tanstack/react-query";
import {
  CLOUD_UPDATING_MESSAGE,
  cloudClient,
  isCloudUpdating,
  type CloudBffResponse,
} from "@/lib/cloudClient";

export type CloudCompatibilityView =
  | { kind: "loading" }
  | { kind: "compatible" }
  | { kind: "updating"; message: string };

export function cloudCompatibilityView(
  result: CloudBffResponse | undefined,
  isPending: boolean,
): CloudCompatibilityView {
  if (isPending || result === undefined) {
    return { kind: "loading" };
  }
  if (isCloudUpdating(result) || !result.ok) {
    return {
      kind: "updating",
      message: isCloudUpdating(result) ? result.error : CLOUD_UPDATING_MESSAGE,
    };
  }
  return { kind: "compatible" };
}

export async function fetchCloudCompatibility(): Promise<CloudBffResponse> {
  return cloudClient.invoke({ action: "compatibility" });
}

export function useCloudCompatibility() {
  const query = useQuery({
    queryKey: ["cloud", "compatibility"],
    queryFn: fetchCloudCompatibility,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });

  const view = query.isError && query.data === undefined
    ? { kind: "updating" as const, message: CLOUD_UPDATING_MESSAGE }
    : cloudCompatibilityView(query.data, query.isPending || query.data === undefined);

  return {
    view,
    updating: view.kind === "updating",
    compatible: view.kind === "compatible",
    message: view.kind === "updating" ? view.message : undefined,
    refetch: query.refetch,
  };
}
