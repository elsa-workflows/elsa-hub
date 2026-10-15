import { supabase } from "@/integrations/supabase/client";
import {
  CLOUD_BFF_FUNCTION,
  CLOUD_UPDATING_CODE,
  CLOUD_UPDATING_MESSAGE,
  isCloudUpdating,
  type CloudBffRequest,
  type CloudBffResponse,
  type CloudUpdatingState,
} from "./contract";

const updating = (): CloudUpdatingState => ({
  ok: false,
  state: "updating",
  code: CLOUD_UPDATING_CODE,
  error: CLOUD_UPDATING_MESSAGE,
});

function asResponse(value: unknown): CloudBffResponse | null {
  if (!value || typeof value !== "object") return null;
  const record = value as CloudBffResponse;
  if (typeof record.ok !== "boolean") return null;
  return record;
}

export const bffCloudClient = {
  async invoke(body: CloudBffRequest): Promise<CloudBffResponse> {
    const { data, error } = await supabase.functions.invoke(CLOUD_BFF_FUNCTION, { body });
    const parsed = asResponse(data);
    if (parsed && isCloudUpdating(parsed)) return parsed;
    if (parsed) return parsed;
    if (error) return updating();
    return updating();
  },
};
