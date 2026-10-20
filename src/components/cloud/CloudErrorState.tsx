import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CLOUD_ERROR_HEADING, CLOUD_ERROR_RETRY } from "@/lib/cloudClient";

export function CloudErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{CLOUD_ERROR_HEADING}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{message}</p>
        {onRetry && (
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            {CLOUD_ERROR_RETRY}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
