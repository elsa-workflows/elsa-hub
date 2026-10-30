import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  accountLinkResultView,
  reauthMessage,
  type CloudAccountLinkStaleSession,
} from "@/lib/cloud";
import {
  getCloudAccountAccessToken,
  isCloudAccountAuthConfigured,
  signInCloudAccountEmail,
  signInCloudAccountOAuth,
  signOutCloudAccount,
  type CloudAccountOAuthProvider,
} from "@/lib/cloud/cloudAccountAuth";
import { cloudClient } from "@/lib/cloudClient";

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
  const configured = isCloudAccountAuthConfigured();
  const [cloudSignedIn, setCloudSignedIn] = useState(false);
  const [view, setView] = useState<CloudAccountLinkPageView>(
    configured ? { kind: "needs_cloud" } : { kind: "unavailable" },
  );

  const refreshCloudSession = useCallback(async () => {
    const token = await getCloudAccountAccessToken();
    setCloudSignedIn(Boolean(token));
    if (token) {
      setView((current) =>
        current.kind === "needs_cloud" || current.kind === "unavailable"
          ? { kind: "ready" }
          : current
      );
    }
    return token;
  }, []);

  async function signInOAuth(provider: CloudAccountOAuthProvider) {
    await signInCloudAccountOAuth(provider);
  }

  async function signInEmail(email: string, password: string) {
    await signInCloudAccountEmail(email, password);
    await refreshCloudSession();
  }

  async function linkAccount() {
    const token = await getCloudAccountAccessToken();
    if (!token) {
      setView({ kind: "needs_cloud" });
      return;
    }
    setView({ kind: "pending" });
    const result = accountLinkResultView(
      await cloudClient.invoke({ action: "linkCloudAccount", cloudAccessToken: token }),
    );
    if (result.kind === "linked" || result.kind === "already_linked") {
      sessionStorage.removeItem(RETRY_KEY);
      await queryClient.invalidateQueries({ queryKey: ["cloud"] });
      setView(result);
      return;
    }
    if (result.kind === "reauth") {
      const alreadyRetried = sessionStorage.getItem(RETRY_KEY) === "1";
      sessionStorage.setItem(RETRY_KEY, "1");
      if (result.staleSession === "cloud" || result.staleSession === "both") {
        await signOutCloudAccount();
        setCloudSignedIn(false);
      }
      setView({
        kind: "reauth",
        staleSession: result.staleSession,
        message: alreadyRetried
          ? `${reauthMessage(result.staleSession)} The previous retry did not complete.`
          : reauthMessage(result.staleSession),
      });
      return;
    }
    setView(result);
  }

  async function retryLink() {
    await refreshCloudSession();
    await linkAccount();
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
