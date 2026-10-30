import { rememberAuthRedirect } from "@/lib/authRedirect";
import { cloudLoginRedirect } from "@/lib/cloudPaths";
import { supabase } from "@/integrations/supabase/client";
import {
  CLOUD_ACCOUNT_LINK_CLOUD_MISSING,
  CLOUD_ACCOUNT_LINK_CONFLICT,
  CLOUD_ACCOUNT_LINK_HAS_ENGINES,
  CLOUD_ACCOUNT_LINK_HAS_STATE,
  CLOUD_ACCOUNT_LINK_REAUTH,
  CLOUD_ACCOUNT_LINK_SESSIONS,
  isCloudBffError,
  isCloudUpdating,
  type CloudAccountLinkStaleSession,
  type CloudBffResponse,
} from "./actions";

export function accountLinkResultView(response: CloudBffResponse):
  | { kind: "linked" }
  | { kind: "already_linked" }
  | { kind: "reauth"; staleSession: CloudAccountLinkStaleSession }
  | { kind: "conflict"; message: string }
  | { kind: "error"; message: string } {
  if (response.ok && "state" in response && response.state === "already_linked") {
    return { kind: "already_linked" };
  }
  if (response.ok && "state" in response && response.state === "linked") {
    return { kind: "linked" };
  }
  if (isCloudBffError(response) && response.code === "reauthentication_required") {
    return { kind: "reauth", staleSession: response.staleSession ?? "both" };
  }
  if (isCloudBffError(response) && response.code === "sessions_required") {
    return { kind: "error", message: CLOUD_ACCOUNT_LINK_SESSIONS };
  }
  if (isCloudBffError(response) && response.code === "cloud_account_missing") {
    return { kind: "conflict", message: CLOUD_ACCOUNT_LINK_CLOUD_MISSING };
  }
  if (isCloudBffError(response) && response.code === "account_already_linked") {
    return { kind: "conflict", message: CLOUD_ACCOUNT_LINK_CONFLICT };
  }
  if (isCloudBffError(response) && response.code === "hub_account_has_engines") {
    return { kind: "conflict", message: CLOUD_ACCOUNT_LINK_HAS_ENGINES };
  }
  if (isCloudBffError(response) && response.code === "hub_account_has_state") {
    return { kind: "conflict", message: CLOUD_ACCOUNT_LINK_HAS_STATE };
  }
  if (isCloudBffError(response)) {
    return { kind: "error", message: response.error };
  }
  if (isCloudUpdating(response)) {
    return { kind: "error", message: response.error };
  }
  return { kind: "error", message: CLOUD_ACCOUNT_LINK_REAUTH };
}

export const ACCOUNT_LINK_AUTO_RETRY_KEY = "elsa.cloud.account-link.auto-retry";

export async function startHubReauth(returnPath: string): Promise<void> {
  sessionStorage.setItem(ACCOUNT_LINK_AUTO_RETRY_KEY, "1");
  rememberAuthRedirect(returnPath);
  await supabase.auth.signOut({ scope: "local" });
  window.location.assign(cloudLoginRedirect(returnPath));
}

export function reauthMessage(staleSession: CloudAccountLinkStaleSession): string {
  if (staleSession === "hub") return "Sign in to the Hub again, then retry the link.";
  if (staleSession === "cloud") return "Sign in to Elsa Cloud again, then retry the link.";
  return "Sign in to the Hub and Elsa Cloud again, then retry the link.";
}
