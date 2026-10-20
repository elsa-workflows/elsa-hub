import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Github, Loader2, Mail, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import {
  describeAuthError,
  EMAIL_SEND_RATE_LIMIT_DEFAULT_MS,
  isEmailSendRateLimit,
  parseEmailSendRetryAfterMs,
} from "@/lib/authErrors";
import { rememberAuthRedirect, sanitizeAuthRedirect } from "@/lib/authRedirect";
import { GoogleIcon } from "./GoogleIcon";

export const MAGIC_LINK_RESEND_COOLDOWN_MS = 60_000;
export const MAGIC_LINK_STILL_SENDING_MS = 8_000;

const magicLinkSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type MagicLinkValues = z.infer<typeof magicLinkSchema>;
type OAuthProvider = "github" | "google";
type MagicLinkStatus = "idle" | "loading" | "sent" | "error";

type PasswordlessAuthProps = {
  redirectTo?: string | null;
};

export function PasswordlessAuth({ redirectTo }: PasswordlessAuthProps) {
  const { signInWithGitHub, signInWithGoogle, signInWithMagicLink } = useAuth();
  const [oauthProvider, setOauthProvider] = useState<OAuthProvider | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [magicStatus, setMagicStatus] = useState<MagicLinkStatus>("idle");
  const [magicError, setMagicError] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [slowSend, setSlowSend] = useState(false);

  const form = useForm<MagicLinkValues>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    if (cooldownUntil == null) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= cooldownUntil) {
        setCooldownUntil(null);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [cooldownUntil]);

  useEffect(() => {
    if (magicStatus !== "loading") {
      setSlowSend(false);
      return;
    }
    const id = window.setTimeout(() => {
      setSlowSend(true);
    }, MAGIC_LINK_STILL_SENDING_MS);
    return () => window.clearTimeout(id);
  }, [magicStatus]);

  const cooldownSeconds =
    cooldownUntil == null ? 0 : Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const onCooldown = cooldownSeconds > 0;
  const busy = oauthProvider !== null || magicStatus === "loading";
  const safeRedirect = sanitizeAuthRedirect(redirectTo);

  const handleOAuth = async (provider: OAuthProvider) => {
    setOauthProvider(provider);
    setOauthError(null);
    rememberAuthRedirect(safeRedirect);

    const { error } = await (provider === "github" ? signInWithGitHub() : signInWithGoogle());
    if (error) {
      setOauthProvider(null);
      sessionStorage.removeItem("authRedirect");
      setOauthError(describeAuthError(error, "Sign-in failed. Please try again."));
    }
  };

  const onMagicLink = async (values: MagicLinkValues) => {
    if (Date.now() < (cooldownUntil ?? 0)) {
      return;
    }

    const stayOnSent = magicStatus === "sent";
    if (!stayOnSent) {
      setMagicStatus("loading");
    }
    setMagicError(null);
    rememberAuthRedirect(safeRedirect);

    const { error } = await signInWithMagicLink(values.email);
    if (error) {
      if (isEmailSendRateLimit(error)) {
        const retryMs =
          parseEmailSendRetryAfterMs(error) ?? EMAIL_SEND_RATE_LIMIT_DEFAULT_MS;
        setMagicError(describeAuthError(error));
        setCooldownUntil(Date.now() + retryMs);
        if (!stayOnSent) {
          setMagicStatus("error");
        }
        return;
      }
      sessionStorage.removeItem("authRedirect");
      setMagicError(describeAuthError(error, "Could not send a sign-in link. Please try again."));
      setMagicStatus("error");
      return;
    }

    setSentEmail(values.email);
    setMagicStatus("sent");
    setCooldownUntil(Date.now() + MAGIC_LINK_RESEND_COOLDOWN_MS);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={() => handleOAuth("github")}
          disabled={busy}
        >
          {oauthProvider === "github" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Github className="h-4 w-4" />
          )}
          Continue with GitHub
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={() => handleOAuth("google")}
          disabled={busy}
        >
          {oauthProvider === "google" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon className="h-4 w-4" />
          )}
          Continue with Google
        </Button>
      </div>

      {oauthError && (
        <Alert variant="destructive">
          <AlertTitle>Sign-in failed</AlertTitle>
          <AlertDescription>{oauthError}</AlertDescription>
        </Alert>
      )}

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Or email a sign-in link</span>
        </div>
      </div>

      {magicStatus === "sent" ? (
        <Alert>
          <MailCheck className="h-4 w-4" />
          <AlertTitle>Check your inbox</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              We sent a sign-in link to <span className="font-medium text-foreground">{sentEmail}</span>.
              Open it to continue. The link expires shortly and can only be used once.
              You can open it in this browser or another device.
            </p>
            <div className="flex flex-col items-start gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-auto"
                disabled={onCooldown}
                onClick={() => {
                  void onMagicLink({ email: sentEmail });
                }}
              >
                {onCooldown ? `Wait ${cooldownSeconds}s to resend` : "Resend link"}
              </Button>
              <Button
                type="button"
                variant="link"
                className="h-auto p-0"
                onClick={() => {
                  setMagicStatus("idle");
                  setSentEmail("");
                }}
              >
                Use a different email
              </Button>
            </div>
            {/* The surrounding Alert is already a live region; a nested role="alert" would announce the error twice. */}
            {magicError && <p className="text-destructive">{magicError}</p>}
          </AlertDescription>
        </Alert>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onMagicLink)} className="space-y-3">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email for magic link</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" variant="outline" className="w-full gap-2" disabled={busy || onCooldown}>
              {magicStatus === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              {magicStatus === "loading" && slowSend
                ? "Still sending..."
                : onCooldown
                  ? `Wait ${cooldownSeconds}s to resend`
                  : "Email me a sign-in link"}
            </Button>
          </form>
        </Form>
      )}

      {magicStatus === "error" && magicError && (
        <Alert variant="destructive">
          <AlertTitle>Could not send link</AlertTitle>
          <AlertDescription>{magicError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
