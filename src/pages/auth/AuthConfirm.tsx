import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { EmailOtpType } from "@supabase/supabase-js";
import { Loader2, Mail, MailCheck } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { describeAuthError } from "@/lib/authErrors";
import { DEFAULT_POST_AUTH_PATH, sanitizeAuthRedirect } from "@/lib/authRedirect";

const OTP_TYPES = new Set<string>(["email", "magiclink", "signup"]);

function parseOtpType(value: string | null): EmailOtpType | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (OTP_TYPES.has(normalized)) {
    return normalized as EmailOtpType;
  }
  return null;
}

export default function AuthConfirm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenHash = searchParams.get("token_hash") ?? "";
  const otpType = parseOtpType(searchParams.get("type"));
  const redirectParam = searchParams.get("redirect");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    tokenHash ? null : "This sign-in link is missing its token. Request a new one.",
  );

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

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });

    if (error) {
      setBusy(false);
      setErrorMessage(describeAuthError(error));
      return;
    }

    navigate(sanitizeAuthRedirect(redirectParam) ?? DEFAULT_POST_AUTH_PATH);
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
              {isSignup ? "Confirm your email" : "Sign in"}
            </CardTitle>
            <CardDescription className="text-base">
              {isSignup
                ? "Click Confirm to activate your account. This page does not verify the link until you click."
                : "Click Sign in to continue. This page does not verify the link until you click."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : null}
            {tokenHash ? (
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
