import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { EmailOtpType } from "@supabase/supabase-js";
import { Loader2, Mail, MailCheck } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { describeAuthError } from "@/lib/authErrors";
import {
  consumeAuthRedirect,
  DEFAULT_POST_AUTH_PATH,
  sanitizeAuthRedirect,
} from "@/lib/authRedirect";

const OTP_TYPES = new Set<string>(["email", "signup"]);

// Long enough to read "Not you?" and reach the Sign out button before we navigate away.
export const AUTH_CONFIRM_SIGNED_IN_MS = 3000;

function parseOtpType(value: string | null): EmailOtpType | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (OTP_TYPES.has(normalized)) {
    return normalized as EmailOtpType;
  }
  return null;
}

function stripTokenFromUrl() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("token_hash") && !url.searchParams.has("type")) {
    return;
  }
  url.searchParams.delete("token_hash");
  url.searchParams.delete("type");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export default function AuthConfirm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [tokenHash] = useState(() => searchParams.get("token_hash") ?? "");
  const [otpType] = useState(() => parseOtpType(searchParams.get("type")));
  const [redirectParam] = useState(() => searchParams.get("redirect"));
  const [busy, setBusy] = useState(false);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [destination, setDestination] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    tokenHash ? null : "This sign-in link is missing its token. Request a new one.",
  );

  useEffect(() => {
    stripTokenFromUrl();
  }, []);

  useEffect(() => {
    if (!signedInEmail || !destination) return;
    const id = window.setTimeout(() => {
      navigate(destination);
    }, AUTH_CONFIRM_SIGNED_IN_MS);
    return () => window.clearTimeout(id);
  }, [signedInEmail, destination, navigate]);

  const isSignup = otpType === "signup";
  const buttonLabel = isSignup ? "Confirm" : "Sign in";

  const onConfirm = async () => {
    if (!tokenHash) {
      setErrorMessage("This sign-in link is missing its token. Request a new one.");
      return;
    }
    if (!otpType) {
      setErrorMessage(describeAuthError(null));
      return;
    }

    setBusy(true);
    setErrorMessage(null);

    // Consume the stored redirect before verifyOtp so AuthContext's SIGNED_IN handler
    // cannot find it and navigate first. Trade-off: if verification fails, the stored
    // redirect is already gone, so a retry falls back to ?redirect= or the default path.
    const dest = consumeAuthRedirect(
      sanitizeAuthRedirect(redirectParam) ?? DEFAULT_POST_AUTH_PATH,
    );

    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });

    if (error) {
      setBusy(false);
      setErrorMessage(describeAuthError(error));
      return;
    }

    const email =
      data.user?.email || data.session?.user?.email || "your account";
    setDestination(dest);
    setSignedInEmail(email);
    setBusy(false);
  };

  const onSignOut = async () => {
    setBusy(true);
    setErrorMessage(null);
    // Drop the destination first: that cancels the pending navigation timer, so the
    // user cannot be sent on to the destination while sign-out is in flight.
    setDestination(null);
    // Local scope: "Not you?" must end only this browser's session, not every
    // session of the account's real owner.
    const { error } = await signOut({ scope: "local" });
    setBusy(false);
    if (error) {
      setErrorMessage(describeAuthError(error));
      return;
    }
    setSignedInEmail(null);
    navigate("/login");
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              {isSignup ? (
                <MailCheck className="h-8 w-8 text-primary" />
              ) : (
                <Mail className="h-8 w-8 text-primary" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {signedInEmail ? "Signed in" : isSignup ? "Confirm your email" : "Sign in"}
            </CardTitle>
            <CardDescription className="text-base">
              {signedInEmail
                ? `Signed in as ${signedInEmail}. Not you? Sign out`
                : isSignup
                  ? "Click Confirm to activate your account. This page does not verify the link until you click."
                  : "Click Sign in to continue. This page does not verify the link until you click."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : null}
            {signedInEmail ? (
              <Button className="w-full" variant="outline" onClick={() => void onSignOut()} disabled={busy}>
                Sign out
              </Button>
            ) : tokenHash ? (
              <Button className="w-full" onClick={() => void onConfirm()} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {buttonLabel}
              </Button>
            ) : null}
            <Button className="w-full" variant="outline" asChild>
              <Link to="/login">Back to Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
