import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AUTH_REDIRECT_STORAGE_KEY,
  getAuthCallbackUrl,
  getAuthConfirmUrl,
  sanitizeAuthRedirect,
} from "@/lib/authRedirect";
import { clearCloudSetupMarker } from "@/lib/cloudClient/setupMarker";

export type OAuthSignInProvider = "github" | "google";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithOAuth: (provider: OAuthSignInProvider) => Promise<{ error: Error | null }>;
  signInWithGitHub: () => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const hasHandledRedirect = useRef(false);
  const currentUserIdRef = useRef<string | null | undefined>(undefined);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Set up auth state listener BEFORE checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Only react to an actual identity change. Supabase re-emits SIGNED_IN on
        // tab focus / token refresh; clearing the cache there remounts the page and
        // closes open dialogs, losing user input.
        const nextUserId = session?.user?.id ?? null;
        const previousUserId = currentUserIdRef.current;
        const identityChanged =
          previousUserId !== undefined && previousUserId !== nextUserId;
        currentUserIdRef.current = nextUserId;

        if (identityChanged && (event === "SIGNED_IN" || event === "SIGNED_OUT")) {
          // Clear ALL cached data to prevent stale user-specific data across account switches
          queryClient.clear();

          // Clear stale organization context from localStorage
          localStorage.removeItem("selected_organization");
          if (event === "SIGNED_OUT" && previousUserId) {
            clearCloudSetupMarker(previousUserId);
          }

          // Force refresh session to ensure the Supabase client has the latest token
          if (event === "SIGNED_IN" && session) {
            supabase.auth.refreshSession();
          }
        }

        // Handle OAuth redirect - check for stored redirect URL
        if (event === "SIGNED_IN" && session && !hasHandledRedirect.current) {
          const stored = sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY);
          if (stored) {
            hasHandledRedirect.current = true;
            sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY);
            const redirectUrl = sanitizeAuthRedirect(stored) ?? "/";
            // Use setTimeout to ensure this happens after React renders
            setTimeout(() => {
              window.location.href = redirectUrl;
            }, 0);
          }
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (currentUserIdRef.current === undefined) {
        currentUserIdRef.current = session?.user?.id ?? null;
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getAuthConfirmUrl(),
      },
    });
    return { error };
  };

  const signInWithOAuth = async (provider: OAuthSignInProvider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getAuthCallbackUrl(),
      },
    });
    return { error };
  };

  const signInWithGitHub = () => signInWithOAuth("github");

  const signInWithGoogle = () => signInWithOAuth("google");

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getAuthConfirmUrl(),
        shouldCreateUser: true,
      },
    });
    return { error };
  };

  const signOut = async () => {
    const id = user?.id ?? currentUserIdRef.current;
    if (id) clearCloudSetupMarker(id);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: true,
        signIn,
        signUp,
        signInWithOAuth,
        signInWithGitHub,
        signInWithGoogle,
        signInWithMagicLink,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
