import { signedActionErrorLine, type CloudActionKind } from "@/lib/cloud/reasonCopy";

export type { CloudActionKind };

// Always maps a cloud-bff error to a customer line. Never returns a raw
// problem code or Control/BFF `error` prose. Launch A permission wording
// and the #948 limit line still follow VITE_CLOUD_SIGNED_COPY inside
// signedActionErrorLine; every other mapped line is always on.
export function cloudActionErrorLine(result: unknown, kind: CloudActionKind = "other"): string | null {
  return signedActionErrorLine(result, kind);
}

export { cloudLimitMessage } from "./copy";
