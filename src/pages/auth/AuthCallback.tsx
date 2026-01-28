import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

type CallbackStatus = "loading" | "success" | "error";

export default function AuthCallback() {
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Parse hash params (Supabase puts auth data in URL hash)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const error = hashParams.get("error");
        const errorDescription = hashParams.get("error_description");
        const type = hashParams.get("type");

        if (error) {
          setErrorMessage(errorDescription || "An error occurred during verification.");
          setStatus("error");
          return;
        }

        // Let Supabase handle the session from the URL
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          setErrorMessage(sessionError.message);
          setStatus("error");
          return;
        }

        if (data.session) {
          // User is now authenticated
          // Check for stored redirect URL (from OAuth flow)
          const storedRedirect = sessionStorage.getItem("authRedirect");
          sessionStorage.removeItem("authRedirect");
          const redirectTo = storedRedirect || "/dashboard";

          if (type === "signup" || type === "email") {
            // Email confirmation successful
            setStatus("success");
          } else if (type === "recovery") {
            // Password recovery - redirect to password reset page
            navigate("/reset-password");
          } else {
            // OAuth login or other auth types - redirect to dashboard
            navigate(redirectTo);
          }
        } else {
          // No session but no error - might be loading
          // Wait a moment for the auth state to settle
          const timeout = setTimeout(() => {
            setErrorMessage("Unable to verify your account. The link may have expired.");
            setStatus("error");
          }, 3000);

          // Listen for auth state change
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "SIGNED_IN" && session) {
              clearTimeout(timeout);
              const storedRedirect = sessionStorage.getItem("authRedirect");
              sessionStorage.removeItem("authRedirect");
              navigate(storedRedirect || "/dashboard");
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
                  Please wait while we confirm your email address.
                </CardDescription>
              </CardHeader>
            </>
          )}

          {status === "success" && (
            <>
              <CardHeader className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Account Activated!</CardTitle>
                <CardDescription className="text-base">
                  Your email has been verified and your account is now active.
                  You can now sign in to access all features.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
              </CardContent>
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

