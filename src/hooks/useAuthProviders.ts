import { useState, useMemo, useCallback } from "react";
import { UserIdentity } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export type ProviderConfig = {
  id: string;
  name: string;
  type: "oauth" | "email";
};

// Centralized provider configuration - add new providers here
export const AUTH_PROVIDERS: ProviderConfig[] = [
  { id: "email", name: "Email & Password", type: "email" },
  { id: "github", name: "GitHub", type: "oauth" },
  // Future providers:
  // { id: "google", name: "Google", type: "oauth" },
  // { id: "apple", name: "Apple", type: "oauth" },
  // { id: "azure", name: "Microsoft", type: "oauth" },
];

export function useAuthProviders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLinking, setIsLinking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [isSettingPassword, setIsSettingPassword] = useState(false);

  const identities = useMemo(() => user?.identities ?? [], [user?.identities]);

  const getIdentityForProvider = useCallback(
    (providerId: string): UserIdentity | undefined => {
      return identities.find((i) => i.provider === providerId);
    },
    [identities]
  );

  const isProviderConnected = useCallback(
    (providerId: string): boolean => {
      return identities.some((i) => i.provider === providerId);
    },
    [identities]
  );

  const canDisconnect = useMemo(() => {
    // User must have at least one provider to prevent lockout
    return identities.length > 1;
  }, [identities.length]);

  const linkOAuthProvider = useCallback(
    async (provider: "github" | "google" | "apple" | "azure") => {
      setIsLinking(true);
      try {
        // Store redirect URL to return to profile settings after linking
        sessionStorage.setItem("authRedirect", "/dashboard/settings/profile");
        sessionStorage.setItem("linkingProvider", provider);

        const { error } = await supabase.auth.linkIdentity({
          provider,
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) {
          toast({
            title: "Failed to connect",
            description: error.message,
            variant: "destructive",
          });
          sessionStorage.removeItem("authRedirect");
          sessionStorage.removeItem("linkingProvider");
        }
        // If successful, user will be redirected to OAuth provider
      } catch (error) {
        toast({
          title: "Failed to connect",
          description: "An unexpected error occurred.",
          variant: "destructive",
        });
        sessionStorage.removeItem("authRedirect");
        sessionStorage.removeItem("linkingProvider");
      } finally {
        setIsLinking(false);
      }
    },
    [toast]
  );

  const unlinkProvider = useCallback(
    async (identity: UserIdentity) => {
      if (!canDisconnect) {
        toast({
          title: "Cannot disconnect",
          description:
            "You must have at least one login method connected to your account.",
          variant: "destructive",
        });
        return { success: false };
      }

      setIsUnlinking(true);
      try {
        const { error } = await supabase.auth.unlinkIdentity(identity);

        if (error) {
          toast({
            title: "Failed to disconnect",
            description: error.message,
            variant: "destructive",
          });
          return { success: false };
        }

        toast({
          title: "Disconnected",
          description: `${identity.provider} has been disconnected from your account.`,
        });
        return { success: true };
      } catch (error) {
        toast({
          title: "Failed to disconnect",
          description: "An unexpected error occurred.",
          variant: "destructive",
        });
        return { success: false };
      } finally {
        setIsUnlinking(false);
      }
    },
    [canDisconnect, toast]
  );

  const setupEmailPassword = useCallback(
    async (password: string) => {
      setIsSettingPassword(true);
      try {
        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
          toast({
            title: "Failed to set password",
            description: error.message,
            variant: "destructive",
          });
          return { success: false };
        }

        toast({
          title: "Password set",
          description: "You can now sign in with your email and password.",
        });
        return { success: true };
      } catch (error) {
        toast({
          title: "Failed to set password",
          description: "An unexpected error occurred.",
          variant: "destructive",
        });
        return { success: false };
      } finally {
        setIsSettingPassword(false);
      }
    },
    [toast]
  );

  return {
    identities,
    providers: AUTH_PROVIDERS,
    isProviderConnected,
    getIdentityForProvider,
    canDisconnect,
    linkOAuthProvider,
    unlinkProvider,
    setupEmailPassword,
    isLinking,
    isUnlinking,
    isSettingPassword,
  };
}
