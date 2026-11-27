import { CLOUD_CHANGED_SINCE_READ_CODE, CLOUD_LIMIT_CODE, CLOUD_LIMIT_MESSAGE } from "@/lib/cloud";
import { signedActionErrorLine, type CloudActionKind } from "@/lib/cloud/reasonCopy";
import { isCloudSignedCopyEnabled } from "./signedCopyFlag";
import { CLOUD_DELETE_CHANGED_SINCE_READ } from "./copy";
import { cloudLimitMessage } from "./copy";

export type { CloudActionKind };

// Maps a cloud-bff error to a line the UI can show. Reuses signed or already
// shipped lines only. New Control codes fall back to the existing generic
// line; Launch owns any more specific copy. When the signed-copy setting is
// on, the #237 table is used instead.
export function cloudActionErrorLine(result: unknown, kind: CloudActionKind = "other"): string | null {
  if (isCloudSignedCopyEnabled()) return signedActionErrorLine(result, kind);
  if (!result || typeof result !== "object" || !("ok" in result) || result.ok) {
    return null;
  }
  const code = "code" in result ? result.code : undefined;
  if (code === CLOUD_CHANGED_SINCE_READ_CODE) return CLOUD_DELETE_CHANGED_SINCE_READ;
  if (code === CLOUD_LIMIT_CODE) return CLOUD_LIMIT_MESSAGE;
  if ("error" in result && typeof result.error === "string" && result.error) {
    return result.error;
  }
  return "That action could not be completed.";
}

export { cloudLimitMessage };
