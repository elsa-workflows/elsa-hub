import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, Building2, LogIn } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type InvitationStatus = "loading" | "valid" | "invalid" | "accepting" | "accepted" | "error";

interface InvitationDetails {
  id: string;
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  email: string;
  role: string;
  expires_at: string;
}

export default function AcceptInvitation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<InvitationStatus>("loading");
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch invitation details
  useEffect(() => {
    async function fetchInvitation() {
      if (!token) {
        setStatus("invalid");
        setError("Invalid invitation link");
        return;
      }

      try {
        const { data, error } = await supabase.rpc("get_invitation_by_token", {
          p_token: token,
        });

        if (error) {
          console.error("Error fetching invitation:", error);
          setStatus("invalid");
          setError("Failed to load invitation");
          return;
        }

        if (!data || data.length === 0) {
          setStatus("invalid");
          setError("This invitation is invalid or has expired");
          return;
        }

        setInvitation(data[0] as InvitationDetails);
        setStatus("valid");
      } catch (err) {
        console.error("Error:", err);
        setStatus("invalid");
        setError("Failed to load invitation");
      }
    }

    if (!authLoading) {
      fetchInvitation();
    }
  }, [token, authLoading]);

  const handleAccept = async () => {
    if (!token || !user) return;

    setStatus("accepting");

    try {
      const { data, error } = await supabase.rpc("accept_invitation", {
        p_token: token,
      });

      if (error) {
        console.error("Error accepting invitation:", error);
        setStatus("error");
        setError(error.message || "Failed to accept invitation");
        toast({
          title: "Error",
          description: error.message || "Failed to accept invitation",
          variant: "destructive",
        });
        return;
      }

      setStatus("accepted");
      toast({
        title: "Welcome!",
        description: `You've joined ${invitation?.organization_name}`,
      });

      // Redirect to the organization dashboard after a short delay
      setTimeout(() => {
        navigate(`/org/${invitation?.organization_slug}`);
      }, 2000);
    } catch (err) {
      console.error("Error:", err);
      setStatus("error");
      setError("Failed to accept invitation");
    }
  };

  if (authLoading || status === "loading") {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading invitation...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (status === "invalid" || status === "error") {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle>Invalid Invitation</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button asChild>
                <Link to="/">Go to Home</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (status === "accepted") {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
              <CardTitle>Welcome to {invitation?.organization_name}!</CardTitle>
              <CardDescription>
                You've successfully joined as a {invitation?.role}. Redirecting you to the
                organization dashboard...
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Valid invitation - show accept UI
  if (!user) {
    // User needs to log in first
    return (
      <Layout>
        <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>You're Invited!</CardTitle>
              <CardDescription>
                You've been invited to join <strong>{invitation?.organization_name}</strong> as a{" "}
                <strong>{invitation?.role}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                Please sign in or create an account with <strong>{invitation?.email}</strong> to
                accept this invitation.
              </p>
              <div className="flex flex-col gap-3">
                <Button asChild className="w-full gap-2">
                  <Link to={`/login?redirect=/invite/${token}`}>
                    <LogIn className="h-4 w-4" />
                    Sign In to Accept
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to={`/signup?redirect=/invite/${token}&email=${encodeURIComponent(invitation?.email || "")}`}>
                    Create Account
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // User is logged in - show accept button
  return (
    <Layout>
      <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Join {invitation?.organization_name}</CardTitle>
            <CardDescription>
              You've been invited to join as a <strong>{invitation?.role}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {user.email?.toLowerCase() !== invitation?.email.toLowerCase() && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">
                  <strong>Note:</strong> This invitation was sent to{" "}
                  <strong>{invitation?.email}</strong>, but you're signed in as{" "}
                  <strong>{user.email}</strong>. You may need to sign in with the correct account.
                </p>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleAccept}
                disabled={status === "accepting"}
                className="w-full gap-2"
              >
                {status === "accepting" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Accept Invitation
                  </>
                )}
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/">Decline</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
