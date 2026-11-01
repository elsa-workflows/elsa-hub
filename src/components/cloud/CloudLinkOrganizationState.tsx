import { Cloud, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CloudSetupStatus } from "@/hooks/useCloudWorkspace";
import {
  CLOUD_ERROR_RETRY,
  CLOUD_LINK_ORG_ACTION,
  CLOUD_LINK_ORG_ERROR,
  CLOUD_LINK_ORG_HEADING,
  CLOUD_LINK_ORG_MESSAGE,
  CLOUD_LINK_ORG_NOT_CONNECTED,
  CLOUD_LINK_ORG_UPDATING,
} from "@/lib/cloudClient";

export type { CloudSetupStatus };

export function CloudLinkOrganizationState({
  canLink,
  onLink,
  onRetry,
  status = "idle",
  message,
}: {
  canLink: boolean;
  onLink?: () => void;
  onRetry?: () => void;
  status?: CloudSetupStatus;
  message?: string;
}) {
  const busy = status === "pending";
  const updating = status === "updating";
  const failed = status === "error";

  return (
    <Card className="p-8 text-center">
      <Cloud className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-50" />
      <h2 className="text-lg font-semibold">{CLOUD_LINK_ORG_HEADING}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {canLink ? CLOUD_LINK_ORG_MESSAGE : CLOUD_LINK_ORG_NOT_CONNECTED}
      </p>
      {updating && (
        <p className="mt-3 text-sm text-muted-foreground" role="status">
          {message ?? CLOUD_LINK_ORG_UPDATING}
        </p>
      )}
      {failed && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-destructive" role="alert">
            {message ?? CLOUD_LINK_ORG_ERROR}
          </p>
          {canLink && onRetry && (
            <Button type="button" variant="outline" className="min-h-11" onClick={onRetry}>
              {CLOUD_ERROR_RETRY}
            </Button>
          )}
        </div>
      )}
      {canLink && onLink && !failed && (
        <Button
          type="button"
          className="mt-4 min-h-11 min-w-11"
          onClick={onLink}
          disabled={busy}
          aria-busy={busy}
        >
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
          {CLOUD_LINK_ORG_ACTION}
        </Button>
      )}
    </Card>
  );
}
