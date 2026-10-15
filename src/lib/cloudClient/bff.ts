import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  CLOUD_BFF_FUNCTION,
  CLOUD_UPDATING_CODE,
  CLOUD_UPDATING_MESSAGE,
  type CloudBffRequest,
  type CloudBffResponse,
  type CloudUpdatingState,
} from "@/lib/cloud";

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

async function fromHttpError(error: FunctionsHttpError): Promise<CloudBffResponse | null> {
  const context = error.context;
  if (!context || typeof context.json !== "function") return null;
  try {
    return asResponse(await context.json());
  } catch {
    return null;
  }
}

export const bffCloudClient = {
  async invoke(body: CloudBffRequest): Promise<CloudBffResponse> {
    try {
      const { data, error } = await supabase.functions.invoke(CLOUD_BFF_FUNCTION, { body });
      const parsed = asResponse(data);
      if (parsed) return parsed;
      if (error instanceof FunctionsHttpError) {
        const fromError = await fromHttpError(error);
        if (fromError) return fromError;
      }
      return updating();
    } catch {
      return updating();
    }
  },
};
