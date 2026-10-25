import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import { User, Session, type SignOutScope } from "@supabase/supabase-js";
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
  signOut: (options?: { scope?: SignOutScope }) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function shouldReuseAuthIdentity(event: string) {
  return event === "TOKEN_REFRESHED" || event === "SIGNED_IN" || event === "INITIAL_SESSION";
}

function applyAuthSnapshot(
  setUser: (updater: (prev: User | null) => User | null) => void,
  setSession: (updater: (prev: Session | null) => Session | null) => void,
  nextUser: User | null,
  nextSession: Session | null,
  reuseIdentity: boolean,
) {
  setUser((prev) =>
    reuseIdentity && prev?.id && nextUser?.id && prev.id === nextUser.id ? prev : nextUser,
  );
  setSession((prev) =>
    reuseIdentity &&
    prev?.access_token === nextSession?.access_token &&
    prev?.user?.id === nextSession?.user?.id
      ? prev
      : nextSession,
  );
}

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
        const nextUser = session?.user ?? null;
        const nextUserId = nextUser?.id ?? null;
        const previousUserId = currentUserIdRef.current;
        const identityChanged =
          previousUserId !== undefined && previousUserId !== nextUserId;
        currentUserIdRef.current = nextUserId;

        // supabase-js re-emits TOKEN_REFRESHED / SIGNED_IN on visibilitychange.
        // Reuse the same user object for those events (and INITIAL_SESSION)
        // when the id is unchanged so hooks that depend on `user` do not
        // refetch and remount the dashboard. USER_UPDATED must apply the new
        // user and session (password setup, email/identity changes).
        applyAuthSnapshot(
          setUser,
          setSession,
          nextUser,
          session,
          shouldReuseAuthIdentity(event),
        );
        setLoading(false);

        if (identityChanged && (event === "SIGNED_IN" || event === "SIGNED_OUT")) {
          // Clear ALL cached data to prevent stale user-specific data across account switches
          queryClient.clear();

          // Clear stale organization context from localStorage
          localStorage.removeItem("selected_organization");
          if (event === "SIGNED_OUT" && previousUserId) {
            clearCloudSetupMarker(previousUserId);
          }
        }

        // Handle OAuth redirect - check for stored redirect URL.
        // /auth/confirm consumes the stored redirect before verifyOtp, so this
        // finds nothing there and the page keeps its signed-in banner.
        // This callback makes no supabase.auth calls (supabase-js guidance is not
        // to await supabase calls inside onAuthStateChange). setTimeout(0) only
        // defers window.location until after React renders.
        if (event === "SIGNED_IN" && session && !hasHandledRedirect.current) {
          const stored = sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY);
          if (stored) {
            hasHandledRedirect.current = true;
            sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY);
            const redirectUrl = sanitizeAuthRedirect(stored) ?? "/";
            setTimeout(() => {
              window.location.href = redirectUrl;
            }, 0);
          }
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const nextUser = session?.user ?? null;
      if (currentUserIdRef.current === undefined) {
        currentUserIdRef.current = nextUser?.id ?? null;
      }
      applyAuthSnapshot(setUser, setSession, nextUser, session, true);
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
    // Single signInWithOtp, no extra awaits. The cause of the POST /otp stall
    // seen in prod is unknown; see docs/auth-identity-linking.md.
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getAuthConfirmUrl(),
        shouldCreateUser: true,
      },
    });
    return { error };
  };

  const signOut = async (options?: { scope?: SignOutScope }) => {
    const id = user?.id ?? currentUserIdRef.current;
    const { error } = await supabase.auth.signOut(options);
    // Only forget the cloud setup once this session is really gone. "others" leaves
    // this session signed in, and a failed sign-out leaves the user signed in too.
    if (id && !error && options?.scope !== "others") clearCloudSetupMarker(id);
    return { error };
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
