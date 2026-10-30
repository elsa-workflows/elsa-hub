import { RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CLOUD_UPDATING_HEADING, CLOUD_UPDATING_MESSAGE, CLOUD_UPDATING_RETRY } from "@/lib/cloudClient";

export function CloudUpdatingState({
  message = CLOUD_UPDATING_MESSAGE,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <Alert>
      <RefreshCw className="h-4 w-4" />
      <AlertTitle>{CLOUD_UPDATING_HEADING}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{message}</p>
        {onRetry && (
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            {CLOUD_UPDATING_RETRY}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
