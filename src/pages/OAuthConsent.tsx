import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Typed thin wrapper over the beta supabase.auth.oauth namespace so we don't
// have to hit `/oauth/authorizations` directly.
type AuthorizationDetails = {
  redirect_url?: string;
  redirect_to?: string;
  client?: { name?: string; client_uri?: string; logo_uri?: string };
  scopes?: string[];
};
type OAuthApi = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};
const oauthApi = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?redirect=" + encodeURIComponent(next);
        return;
      }
      if (!oauthApi?.getAuthorizationDetails) {
        setError(
          "OAuth authorization server is not enabled on this Supabase project. Enable OAuth 2.1 in Supabase Auth settings.",
        );
        return;
      }
      const { data, error } = await oauthApi.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauthApi.approveAuthorization(authorizationId)
      : await oauthApi.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("No redirect returned by the authorization server.");
    }
    window.location.href = target;
  }

  return (
    <Layout>
      <div className="container mx-auto max-w-lg py-16">
        <Card>
          <CardHeader>
            <CardTitle>Connect an agent to Elsa Workflows</CardTitle>
            <CardDescription>
              Review and approve a Model Context Protocol client that wants to use this app on your behalf.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : !details ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading authorization request…
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Requesting client</p>
                  <p className="text-base font-medium">{details.client?.name ?? "Unknown client"}</p>
                  {details.client?.client_uri ? (
                    <a
                      href={details.client.client_uri}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-muted-foreground underline"
                    >
                      {details.client.client_uri}
                    </a>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  Approving lets this client read your Elsa Workflows data and act as you through the MCP server.
                  You can revoke access at any time from your account settings.
                </p>
                <div className="flex items-center justify-end gap-3">
                  <Button variant="ghost" disabled={busy} onClick={() => decide(false)}>
                    Deny
                  </Button>
                  <Button disabled={busy} onClick={() => decide(true)}>
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Approve
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
