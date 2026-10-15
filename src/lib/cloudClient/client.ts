import { bffCloudClient } from "./bff";
import type { CloudBffRequest, CloudBffResponse } from "@/lib/cloud";

export type CloudClient = {
  invoke(body: CloudBffRequest): Promise<CloudBffResponse>;
};

/**
 * Production always uses the cloud-bff client. The stub is loaded only when
 * `import.meta.env.DEV` is true (Vite drops that branch from the prod graph).
 */
export const cloudClient: CloudClient = {
  async invoke(body) {
    if (import.meta.env.DEV) {
      const { stubCloudClient } = await import("./stub");
      return stubCloudClient.invoke(body);
    }
    return bffCloudClient.invoke(body);
  },
};
