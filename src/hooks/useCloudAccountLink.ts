import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import type { CloudAccountLinkStaleSession } from "@/lib/cloud";
import {
  ACCOUNT_LINK_AUTO_RETRY_KEY,
  accountLinkResultView,
  reauthMessage,
  startHubReauth,
} from "@/lib/cloud/accountLink";
import {
  getCloudAccountAccessToken,
  isCloudAccountAuthConfigured,
  signInCloudAccountEmail,
  signInCloudAccountOAuth,
  signOutCloudAccount,
  type CloudAccountOAuthProvider,
} from "@/lib/cloud/cloudAccountAuth";
import { CLOUD_ACCOUNT_LINK_SIGNIN_FAILED, cloudClient } from "@/lib/cloudClient";
import { useCloudConsolePaths } from "@/lib/cloudPaths";

const RETRY_KEY = "elsa.cloud.account-link.retry";

export type CloudAccountLinkPageView =
  | { kind: "needs_cloud" }
  | { kind: "ready" }
  | { kind: "pending" }
  | { kind: "linked" }
  | { kind: "already_linked" }
  | { kind: "reauth"; staleSession: CloudAccountLinkStaleSession; message: string }
  | { kind: "conflict"; message: string }
  | { kind: "error"; message: string }
  | { kind: "unavailable" };

export function useCloudAccountLink() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { link } = useCloudConsolePaths();
  const configured = isCloudAccountAuthConfigured();
  const [cloudSignedIn, setCloudSignedIn] = useState(false);
  const [view, setView] = useState<CloudAccountLinkPageView>(
    configured ? { kind: "needs_cloud" } : { kind: "unavailable" },
  );

  const clearCloudSession = useCallback(async () => {
    await signOutCloudAccount();
    setCloudSignedIn(false);
  }, []);

  const runLink = useCallback(async (token: string) => {
    setView({ kind: "pending" });
    const result = accountLinkResultView(
      await cloudClient.invoke({ action: "linkCloudAccount", cloudAccessToken: token }),
    );
    if (result.kind === "linked" || result.kind === "already_linked") {
      sessionStorage.removeItem(RETRY_KEY);
      sessionStorage.removeItem(ACCOUNT_LINK_AUTO_RETRY_KEY);
      await queryClient.invalidateQueries({ queryKey: ["cloud"] });
      await clearCloudSession();
      setView(result);
      return result;
    }
    if (result.kind === "reauth") {
      const alreadyRetried = sessionStorage.getItem(RETRY_KEY) === "1";
      sessionStorage.setItem(RETRY_KEY, "1");
      if (result.staleSession === "cloud" || result.staleSession === "both") {
        await clearCloudSession();
      }
      setView({
        kind: "reauth",
        staleSession: result.staleSession,
        message: alreadyRetried
          ? `${reauthMessage(result.staleSession)} The previous retry did not complete.`
          : reauthMessage(result.staleSession),
      });
      if (!alreadyRetried && (result.staleSession === "hub" || result.staleSession === "both")) {
        await startHubReauth(link);
      } else if (!alreadyRetried) {
        sessionStorage.setItem(ACCOUNT_LINK_AUTO_RETRY_KEY, "1");
      }
      return result;
    }
    sessionStorage.removeItem(RETRY_KEY);
    sessionStorage.removeItem(ACCOUNT_LINK_AUTO_RETRY_KEY);
    if (result.kind === "conflict") {
      await clearCloudSession();
    }
    setView(result);
    return result;
  }, [clearCloudSession, link, queryClient]);

  const refreshCloudSession = useCallback(async () => {
    const token = await getCloudAccountAccessToken(user?.id);
    setCloudSignedIn(Boolean(token));
    if (!token) return null;
    setView((current) =>
      current.kind === "needs_cloud" || current.kind === "unavailable" || current.kind === "reauth"
        ? { kind: "ready" }
        : current
    );
    if (sessionStorage.getItem(ACCOUNT_LINK_AUTO_RETRY_KEY) === "1") {
      sessionStorage.removeItem(ACCOUNT_LINK_AUTO_RETRY_KEY);
      await runLink(token);
    }
    return token;
  }, [runLink, user?.id]);

  async function signInOAuth(provider: CloudAccountOAuthProvider) {
    if (!user?.id) {
      setView({ kind: "error", message: CLOUD_ACCOUNT_LINK_SIGNIN_FAILED });
      return;
    }
    try {
      await signInCloudAccountOAuth(provider, user.id);
    } catch {
      setView({ kind: "error", message: CLOUD_ACCOUNT_LINK_SIGNIN_FAILED });
    }
  }

  async function signInEmail(email: string, password: string) {
    if (!user?.id) {
      setView({ kind: "error", message: CLOUD_ACCOUNT_LINK_SIGNIN_FAILED });
      return;
    }
    try {
      await signInCloudAccountEmail(email, password, user.id);
      await refreshCloudSession();
    } catch {
      setView({ kind: "error", message: CLOUD_ACCOUNT_LINK_SIGNIN_FAILED });
    }
  }

  async function linkAccount() {
    const token = await getCloudAccountAccessToken(user?.id);
    if (!token) {
      setView({ kind: "needs_cloud" });
      return;
    }
    await runLink(token);
  }

  async function retryLink() {
    if (view.kind === "reauth" && (view.staleSession === "hub" || view.staleSession === "both")) {
      await startHubReauth(link);
      return;
    }
    const pendingAutoRetry = sessionStorage.getItem(ACCOUNT_LINK_AUTO_RETRY_KEY) === "1";
    await refreshCloudSession();
    if (!pendingAutoRetry) await linkAccount();
  }

  return {
    configured,
    cloudSignedIn,
    view,
    refreshCloudSession,
    signInOAuth,
    signInEmail,
    linkAccount,
    retryLink,
  };
}
