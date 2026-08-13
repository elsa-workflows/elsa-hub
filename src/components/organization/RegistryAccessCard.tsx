import { format, differenceInCalendarDays } from "date-fns";
import { KeyRound, ExternalLink, AlertTriangle, Clock, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useOrgRegistryAccess, type OrgRegistryGrant } from "@/hooks/useOrgRegistryAccess";

/**
 * DELIBERATE OMISSION — DO NOT ADD A PASSWORD HERE.
 *
 * This panel shows the registry host, the token *name* and its expiry. It must never
 * display a registry password, and there must be no field, tooltip or copy button that
 * implies one is available here. The password exists only in the registry and in the
 * customer's hands — it is never stored in this database, by design. If you are here to
 * "helpfully" surface it, don't.
 */

const REGISTRY_HOST = "valenceruntimeimages.azurecr.io";
const PULLING_IMAGES_DOCS = "https://github.com/valence-works/runtime/wiki/Pulling-Images";
const BILLING_EMAIL = "billing@valence.works";

interface RegistryAccessCardProps {
  organizationId: string | undefined;
}

function isExpired(grant: OrgRegistryGrant) {
  return (
    grant.status === "expired" ||
    (!!grant.token_expires_at && new Date(grant.token_expires_at) < new Date())
  );
}

export function RegistryAccessCard({ organizationId }: RegistryAccessCardProps) {
  const { data, isLoading } = useOrgRegistryAccess(organizationId);

  if (isLoading || !data) return null;
  if (data.runtimeSubscriptions.length === 0) return null;

  const activeSub = data.runtimeSubscriptions.find(
    (s) => s.status === "active" || s.status === "past_due"
  );
  if (!activeSub) return null;

  const grant =
    data.grants.find((g) => g.subscription_id === activeSub.id) ?? data.grants[0] ?? null;

  const grantActive = grant && grant.status === "active" && !isExpired(grant);
  const grantEnded = grant && (grant.status === "revoked" || isExpired(grant));

  const daysToExpiry =
    grantActive && grant.token_expires_at
      ? differenceInCalendarDays(new Date(grant.token_expires_at), new Date())
      : null;
  const approachingExpiry = daysToExpiry !== null && daysToExpiry <= 30;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Registry access
        </CardTitle>
        <CardDescription>
          Container registry credentials for {activeSub.product_name}
          {activeSub.product_tier ? ` (${activeSub.product_tier})` : ""}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* No grant yet — provisioning */}
        {!grant && (
          <div className="space-y-3">
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              Being provisioned
            </Badge>
            <p className="text-sm text-muted-foreground">
              Your subscription is active. Registry credentials are issued by hand, so there is a
              short delay — expect them within one business day. They are sent to your
              organisation's billing contact.
            </p>
          </div>
        )}

        {/* Active grant */}
        {grantActive && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="gap-1">
                <ShieldCheck className="h-3 w-3" />
                Active
              </Badge>
              {approachingExpiry && (
                <Badge variant="outline" className="gap-1 text-amber-600 border-amber-600/40">
                  <AlertTriangle className="h-3 w-3" />
                  Expires in {Math.max(daysToExpiry!, 0)} day{daysToExpiry === 1 ? "" : "s"}
                </Badge>
              )}
            </div>

            <dl className="grid gap-3 sm:grid-cols-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Registry</dt>
                <dd className="font-mono text-xs mt-1 break-all">{REGISTRY_HOST}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Token name</dt>
                <dd className="font-mono text-xs mt-1 break-all">{grant.registry_token_name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Token expires</dt>
                <dd className="mt-1">
                  {grant.token_expires_at
                    ? format(new Date(grant.token_expires_at), "d MMM yyyy")
                    : "—"}
                </dd>
              </div>
            </dl>

            <div>
              <p className="text-sm font-medium mb-2">Sign in to the registry</p>
              <pre className="rounded-lg border bg-muted/40 p-3 text-xs overflow-x-auto">
                <code>{`docker login ${REGISTRY_HOST} -u ${grant.registry_token_name}`}</code>
              </pre>
              {/* Password is entered interactively by the customer. It is never shown here. */}
              <p className="text-xs text-muted-foreground mt-2">
                You will be prompted for the token password that was sent to your billing contact.
                It is not stored here and cannot be retrieved from this dashboard.
              </p>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <span className="font-medium">A successful `docker login` does not prove access.</span>{" "}
                The registry issues a token to any well-formed credential and only checks
                permissions on the pull. Always verify with a real{" "}
                <code className="font-mono text-xs">docker pull</code> before concluding that access
                works.
              </AlertDescription>
            </Alert>

            <a
              href={PULLING_IMAGES_DOCS}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              Pulling images documentation
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        {/* Revoked or expired */}
        {grantEnded && (
          <div className="space-y-3">
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {grant.status === "revoked" ? "Revoked" : "Expired"}
            </Badge>
            <p className="text-sm text-muted-foreground">
              {grant.status === "revoked"
                ? "This registry token has been revoked and can no longer pull images."
                : "This registry token has expired and can no longer pull images."}{" "}
              To have access reissued, contact{" "}
              <a href={`mailto:${BILLING_EMAIL}`} className="text-primary hover:underline">
                {BILLING_EMAIL}
              </a>
              .
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
