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

/** Production and local both talk to cloud-bff. There is no fixture stub. */
export const cloudClient: CloudClient = {
  async invoke(body) {
    const resolved = await bffCloudClient.invoke(body);
    const userId = await currentHubUserId();
    if (userId) {
      forgetCloudSetupIfUserGone(userId, resolved, body.action);
    }
    return resolved;
  },
};
