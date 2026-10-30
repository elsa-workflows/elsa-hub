import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { OrgCloudMembershipGate } from "@/components/cloud/CloudRedirects";
import { CloudPageHeader } from "@/components/cloud/CloudPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCloudAccountLink } from "@/hooks/useCloudAccountLink";
import { CLOUD_ACCOUNT_LINK_ALREADY } from "@/lib/cloud";
import {
  CLOUD_ACCOUNT_LINK_ACTION,
  CLOUD_ACCOUNT_LINK_ALREADY_HEADING,
  CLOUD_ACCOUNT_LINK_CLOUD_EMAIL,
  CLOUD_ACCOUNT_LINK_CLOUD_GOOGLE,
  CLOUD_ACCOUNT_LINK_CLOUD_MICROSOFT,
  CLOUD_ACCOUNT_LINK_CLOUD_PASSWORD,
  CLOUD_ACCOUNT_LINK_CLOUD_SIGN_IN,
  CLOUD_ACCOUNT_LINK_CONFIRM,
  CLOUD_ACCOUNT_LINK_DONE_HEADING,
  CLOUD_ACCOUNT_LINK_INTRO,
  CLOUD_ACCOUNT_LINK_TITLE,
  CLOUD_ACCOUNT_LINK_UNAVAILABLE,
  CLOUD_PAGE_TITLE,
} from "@/lib/cloudClient";
import { useCloudConsolePaths } from "@/lib/cloudPaths";

export default function CloudLinkAccount() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { home } = useCloudConsolePaths();
  const inDashboard = pathname.startsWith("/dashboard");
  const link = useCloudAccountLink();
  const { refreshCloudSession } = link;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    void refreshCloudSession();
  }, [refreshCloudSession]);

  useEffect(() => {
    if (link.view.kind === "linked") {
      navigate(home);
    }
  }, [home, link.view.kind, navigate]);

  return (
    <OrgCloudMembershipGate>
      <>
        <Seo
          path={pathname}
          title={`${CLOUD_ACCOUNT_LINK_TITLE} — ${CLOUD_PAGE_TITLE} — Elsa Workflows`}
          description="Link an existing Elsa Cloud account to this Hub sign-in."
          noIndex
        />
        <section className={inDashboard ? "p-6" : "py-10 md:py-16"}>
          <div className={inDashboard ? "space-y-6 overflow-x-hidden" : "container max-w-3xl space-y-6 overflow-x-hidden"}>
            <CloudPageHeader workspaces={[]} onSelectWorkspace={() => undefined} />
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold break-words">{CLOUD_ACCOUNT_LINK_TITLE}</h1>
              <p className="text-sm text-muted-foreground break-words">{CLOUD_ACCOUNT_LINK_INTRO}</p>
            </div>

            {link.view.kind === "unavailable" && (
              <p className="rounded-lg border px-3 py-3 text-sm">{CLOUD_ACCOUNT_LINK_UNAVAILABLE}</p>
            )}
            {link.view.kind === "already_linked" && (
              <div className="space-y-3 rounded-lg border px-3 py-3">
                <h2 className="font-medium">{CLOUD_ACCOUNT_LINK_ALREADY_HEADING}</h2>
                <p className="text-sm break-words">{CLOUD_ACCOUNT_LINK_ALREADY}</p>
                <Button asChild className="min-h-11">
                  <Link to={home}>Back to {CLOUD_PAGE_TITLE}</Link>
                </Button>
              </div>
            )}
            {link.view.kind === "linked" && (
              <p className="text-sm">{CLOUD_ACCOUNT_LINK_DONE_HEADING}</p>
            )}
            {(link.view.kind === "conflict" || link.view.kind === "error" || link.view.kind === "reauth") && (
              <p className="rounded-lg border px-3 py-3 text-sm break-words">{link.view.message}</p>
            )}

            {link.view.kind !== "already_linked" && link.view.kind !== "unavailable" && (
              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    onClick={() => void link.signInOAuth("google")}
                  >
                    {CLOUD_ACCOUNT_LINK_CLOUD_GOOGLE}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    onClick={() => void link.signInOAuth("azure")}
                  >
                    {CLOUD_ACCOUNT_LINK_CLOUD_MICROSOFT}
                  </Button>
                </div>
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void link.signInEmail(email, password);
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="cloud-account-email">{CLOUD_ACCOUNT_LINK_CLOUD_EMAIL}</Label>
                    <Input
                      id="cloud-account-email"
                      type="email"
                      autoComplete="username"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="min-h-11"
                    />
                    <Label htmlFor="cloud-account-password">{CLOUD_ACCOUNT_LINK_CLOUD_PASSWORD}</Label>
                    <Input
                      id="cloud-account-password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="min-h-11"
                    />
                  </div>
                  <Button type="submit" variant="outline" className="min-h-11">
                    {CLOUD_ACCOUNT_LINK_CLOUD_SIGN_IN}
                  </Button>
                </form>
                <Button
                  type="button"
                  className="min-h-11"
                  disabled={link.view.kind === "pending"}
                  onClick={() => void (link.view.kind === "reauth" ? link.retryLink() : link.linkAccount())}
                >
                  {link.view.kind === "reauth" ? "Retry link" : CLOUD_ACCOUNT_LINK_CONFIRM}
                </Button>
                <p className="text-xs text-muted-foreground">{CLOUD_ACCOUNT_LINK_ACTION}</p>
              </div>
            )}
          </div>
        </section>
      </>
    </OrgCloudMembershipGate>
  );
}
