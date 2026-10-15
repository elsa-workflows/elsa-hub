import { supabase } from "@/integrations/supabase/client";
import { bffCloudClient } from "./bff";
import { forgetCloudSetupIfUserGone } from "./setupMarker";
import type { CloudBffRequest, CloudBffResponse } from "@/lib/cloud";

export type CloudClient = {
  invoke(body: CloudBffRequest): Promise<CloudBffResponse>;
};

async function currentHubUserId(): Promise<string | undefined> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id;
  } catch {
    return undefined;
  }
}

/**
 * Production always uses the cloud-bff client. The stub is loaded only when
 * `import.meta.env.DEV` is true (Vite drops that branch from the prod graph).
 */
export const cloudClient: CloudClient = {
  async invoke(body) {
    const response =
      import.meta.env.DEV
        ? (await import("./stub")).stubCloudClient.invoke(body)
        : bffCloudClient.invoke(body);
    const resolved = await response;
    const userId = await currentHubUserId();
    if (userId) {
      forgetCloudSetupIfUserGone(userId, resolved, body.action);
    }
    return resolved;
  },
};
