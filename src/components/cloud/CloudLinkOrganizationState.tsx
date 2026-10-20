import { Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CLOUD_LINK_ORG_ACTION,
  CLOUD_LINK_ORG_ASK_ADMIN,
  CLOUD_LINK_ORG_HEADING,
  CLOUD_LINK_ORG_MESSAGE,
} from "@/lib/cloudClient";

export function CloudLinkOrganizationState({
  canLink,
  onLink,
  pending = false,
}: {
  canLink: boolean;
  onLink?: () => void;
  pending?: boolean;
}) {
  return (
    <Card className="p-8 text-center">
      <Cloud className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-50" />
      <h2 className="text-lg font-semibold">{CLOUD_LINK_ORG_HEADING}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {canLink ? CLOUD_LINK_ORG_MESSAGE : CLOUD_LINK_ORG_ASK_ADMIN}
      </p>
      {canLink && onLink && (
        <Button type="button" className="mt-4 min-h-11 min-w-11" onClick={onLink} disabled={pending}>
          {CLOUD_LINK_ORG_ACTION}
        </Button>
      )}
    </Card>
  );
}
