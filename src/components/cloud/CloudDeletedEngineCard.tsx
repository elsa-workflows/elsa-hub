import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CloudEngineOverview } from "@/lib/cloud/actions";
import { formatDeletionWhen } from "@/lib/cloud/managedEngineDeletionHistory";
import { deletedCompletedAt, usableOperationId } from "@/lib/cloud/enginePresentation";
import { CLOUD_BILLING_HISTORY_LINK, CLOUD_PAGE_TITLE } from "@/lib/cloudClient";
import {
  CLOUD_DELETED_BANNER_BODY_NO_DATE,
  CLOUD_DELETED_BANNER_HEADING,
  CLOUD_DELETED_BANNER_SECOND_LINE,
  cloudDeletedBannerBody,
  cloudReferenceLine,
} from "@/lib/cloudClient/signedCopy";

export function CloudDeletedEngineCard({
  engine,
  homeHref,
  localCompletedAt,
  localOperationId,
  showInvoices,
  invoicesPending,
  onViewInvoices,
}: {
  engine: CloudEngineOverview;
  homeHref: string;
  localCompletedAt?: string | null;
  localOperationId?: string | null;
  showInvoices: boolean;
  invoicesPending?: boolean;
  onViewInvoices?: () => void;
}) {
  const completedAt = deletedCompletedAt(engine, localCompletedAt);
  const when = formatDeletionWhen(completedAt);
  const body = engine.name && when
    ? cloudDeletedBannerBody(engine.name, when)
    : CLOUD_DELETED_BANNER_BODY_NO_DATE;
  const reference = usableOperationId(localOperationId ?? engine.activeOperation?.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-3">
          <span>{engine.name}</span>
          <Badge variant="secondary" className="px-2.5 py-1 text-sm">Deleted</Badge>
        </CardTitle>
        {engine.slug ? (
          <p className="text-sm text-muted-foreground">{engine.slug}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div role="status" className="space-y-2 rounded-lg border px-3 py-3">
          <p className="font-medium">{CLOUD_DELETED_BANNER_HEADING}</p>
          <p className="text-sm">{body}</p>
          <p className="text-sm">{CLOUD_DELETED_BANNER_SECOND_LINE}</p>
          {reference ? (
            <p className="text-sm text-muted-foreground">{cloudReferenceLine(reference)}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="min-h-11">
            <Link to={homeHref}>Back to {CLOUD_PAGE_TITLE}</Link>
          </Button>
          {showInvoices && onViewInvoices ? (
            <Button
              type="button"
              variant="secondary"
              className="min-h-11"
              disabled={invoicesPending}
              onClick={onViewInvoices}
            >
              {CLOUD_BILLING_HISTORY_LINK}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
