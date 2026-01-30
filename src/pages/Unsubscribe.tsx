import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { CheckCircle, XCircle, Loader2, Settings, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type UnsubscribeType = "all" | "newsletter" | "work_logged" | "purchase" | "subscription";

const TYPE_LABELS: Record<UnsubscribeType, string> = {
  all: "all email notifications",
  newsletter: "the newsletter",
  work_logged: "work logged notifications",
  purchase: "purchase notifications",
  subscription: "subscription notifications",
};

export default function Unsubscribe() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [unsubType, setUnsubType] = useState<UnsubscribeType>("all");

  useEffect(() => {
    const processUnsubscribe = async () => {
      if (!token) {
        setStatus("error");
        setErrorMessage("No unsubscribe token provided.");
        return;
      }

      try {
        // Get type from URL query params
        const urlParams = new URLSearchParams(window.location.search);
        const type = (urlParams.get("type") as UnsubscribeType) || "all";
        setUnsubType(type);

        // Call the unsubscribe edge function
        const response = await fetch(
          `https://tehhrjepyfnhmsgtwzkf.supabase.co/functions/v1/unsubscribe?token=${encodeURIComponent(token)}&type=${type}`,
          { method: "GET" }
        );

        // The edge function returns HTML, but we'll check status
        if (response.ok) {
          setStatus("success");
        } else {
          setStatus("error");
          // Try to extract error from response
          const text = await response.text();
          if (text.includes("already been used")) {
            setErrorMessage("This unsubscribe link has already been used.");
          } else if (text.includes("invalid")) {
            setErrorMessage("This unsubscribe link is invalid.");
          } else {
            setErrorMessage("Failed to process your request. Please try again.");
          }
        }
      } catch (error) {
        console.error("Unsubscribe error:", error);
        setStatus("error");
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
    };

    processUnsubscribe();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-border/50">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4">
            <img
              src="/elsa-logo.png"
              alt="Elsa Workflows"
              className="h-14 w-14"
            />
          </div>
          
          {status === "loading" && (
            <>
              <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin mb-4" />
              <CardTitle className="text-xl">Processing...</CardTitle>
              <CardDescription>
                Please wait while we update your preferences.
              </CardDescription>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-xl">You've been unsubscribed</CardTitle>
              <CardDescription className="text-base">
                You will no longer receive {TYPE_LABELS[unsubType]} from Elsa Workflows.
              </CardDescription>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-10 w-10 text-destructive" />
              </div>
              <CardTitle className="text-xl">Something went wrong</CardTitle>
              <CardDescription className="text-base">
                {errorMessage}
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {status !== "loading" && (
            <>
              <p className="text-center text-sm text-muted-foreground">
                {status === "success"
                  ? "If this was a mistake, you can update your preferences at any time."
                  : "Please try managing your preferences directly."}
              </p>

              <div className="flex flex-col gap-3">
                <Button asChild className="w-full">
                  <Link to="/dashboard/settings/notifications">
                    <Settings className="mr-2 h-4 w-4" />
                    Manage Preferences
                  </Link>
                </Button>

                <Button variant="ghost" asChild className="w-full">
                  <Link to="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Home
                  </Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>

        <div className="px-6 pb-6">
          <div className="border-t border-border pt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Elsa Workflows ·{" "}
              <a
                href="https://elsa-workflows.io"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                elsa-workflows.io
              </a>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
