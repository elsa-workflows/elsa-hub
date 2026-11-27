import { CLOUD_CHANGED_SINCE_READ_CODE, CLOUD_LIMIT_CODE, CLOUD_LIMIT_MESSAGE } from "@/lib/cloud";
import { CLOUD_DELETE_CHANGED_SINCE_READ } from "./copy";

// Maps a cloud-bff error to a line the UI can show. Reuses signed or already
// shipped lines only. New Control codes fall back to the existing generic
// line; Launch owns any more specific copy.
export function cloudActionErrorLine(result: unknown): string | null {
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
