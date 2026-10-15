import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { describeAuthError, parseAuthCallbackError } from "@/lib/authErrors";
import {
  consumeAuthRedirect,
  DEFAULT_POST_AUTH_PATH,
  PROFILE_SETTINGS_PATH,
} from "@/lib/authRedirect";

type CallbackStatus = "loading" | "success" | "error" | "linked";

export default function AuthCallback() {
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [linkedProvider, setLinkedProvider] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase may put errors in the query string (PKCE) or the hash (implicit).
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const type = hashParams.get("type") || new URLSearchParams(window.location.search).get("type");
        const callbackError = parseAuthCallbackError(window.location.search, window.location.hash);

        // Check if this is a linking callback
        const linkingProvider = sessionStorage.getItem("linkingProvider");
        const isLinkingFlow = !!linkingProvider;

        if (callbackError) {
          setErrorMessage(callbackError.message);
          setStatus("error");
          sessionStorage.removeItem("linkingProvider");
          sessionStorage.removeItem("authRedirect");
          return;
        }

        // PKCE: supabase-js exchanges ?code= during client init (detectSessionInUrl).
        // getSession() waits for that initialize and returns the session.
        // If the user opened the link in another browser, init fails with a
        // missing code verifier. Exchange again so that error is mapped.
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          setErrorMessage(describeAuthError(sessionError));
          setStatus("error");
          sessionStorage.removeItem("linkingProvider");
          return;
        }

        const code = new URLSearchParams(window.location.search).get("code");
        let session = data.session;
        if (code && !session) {
          const { data: exchanged, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            setErrorMessage(describeAuthError(exchangeError));
            setStatus("error");
            sessionStorage.removeItem("linkingProvider");
            sessionStorage.removeItem("authRedirect");
            return;
          }
          session = exchanged.session;
        }

        if (session) {
          // Honour the page the user was trying to reach (OAuth + magic link).
          const redirectTo = consumeAuthRedirect();

          if (isLinkingFlow) {
            // This was an identity linking flow
            setLinkedProvider(linkingProvider);
            sessionStorage.removeItem("linkingProvider");
            setStatus("linked");
            // Redirect back to profile settings after a short delay
            setTimeout(() => {
              navigate(redirectTo);
            }, 2000);
          } else if (type === "recovery") {
            // Dead under PKCE: recovery used to arrive as #type=recovery on the
            // implicit hash. PKCE callbacks are ?code= only, so this branch
            // does not run for current magic-link or confirm emails.
            navigate("/reset-password");
          } else if (type === "signup") {
            // Dead under PKCE: signup confirmation used to arrive as
            // #type=signup. PKCE confirmations take the default navigate path.
            setStatus("success");
            setTimeout(() => {
              navigate(redirectTo);
            }, 1500);
          } else {
            // OAuth, magic link (type=magiclink|email), and other sign-ins.
            navigate(redirectTo);
          }
        } else {
          // No session but no error - might be loading
          // Wait a moment for the auth state to settle
          const timeout = setTimeout(() => {
            setErrorMessage("Unable to verify your account. The link may have expired.");
            setStatus("error");
            sessionStorage.removeItem("linkingProvider");
          }, 3000);

          // Listen for auth state change
          // Keep this callback synchronous. supabase-js holds the auth lock
          // while it runs; do not await supabase.auth APIs here.
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "SIGNED_IN" && session) {
              clearTimeout(timeout);
              const storedRedirect = consumeAuthRedirect(
                isLinkingFlow ? PROFILE_SETTINGS_PATH : DEFAULT_POST_AUTH_PATH,
              );

              if (isLinkingFlow) {
                setLinkedProvider(linkingProvider);
                sessionStorage.removeItem("linkingProvider");
                setStatus("linked");
                setTimeout(() => {
                  navigate(storedRedirect);
                }, 2000);
              } else {
                navigate(storedRedirect);
              }
              subscription.unsubscribe();
            }
          });

          return () => {
            clearTimeout(timeout);
            subscription.unsubscribe();
          };
        }
      } catch (err) {
        setErrorMessage("An unexpected error occurred.");
        setStatus("error");
        sessionStorage.removeItem("linkingProvider");
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <Layout>
      <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md text-center">
          {status === "loading" && (
            <>
              <CardHeader className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                </div>
                <CardTitle className="text-2xl">Verifying your account...</CardTitle>
                <CardDescription className="text-base">
                  Please wait while we finish signing you in.
                </CardDescription>
              </CardHeader>
            </>
          )}

          {/* success is only set by the implicit #type=signup branch above. */}
          {status === "success" && (
            <>
              <CardHeader className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Account Activated!</CardTitle>
                <CardDescription className="text-base">
                  Your email has been verified and your account is now active.
                  Redirecting you to Elsa Hub…
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
              </CardContent>
            </>
          )}

          {status === "linked" && (
            <>
              <CardHeader className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Account Connected!</CardTitle>
                <CardDescription className="text-base">
                  {linkedProvider.charAt(0).toUpperCase() + linkedProvider.slice(1)} has been 
                  successfully connected to your account. Redirecting...
                </CardDescription>
              </CardHeader>
            </>
          )}

          {status === "error" && (
            <>
              <CardHeader className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <CardTitle className="text-2xl">Verification Failed</CardTitle>
                <CardDescription className="text-base">
                  {errorMessage}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" asChild>
                  <Link to="/login">Back to Sign In</Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/signup">Try Signing Up Again</Link>
                </Button>
                <Button variant="ghost" className="w-full" asChild>
                  <Link to="/">Go to Home</Link>
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </Layout>
  );
}

