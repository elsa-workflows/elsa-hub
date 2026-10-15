import { RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CLOUD_UPDATING_HEADING } from "@/lib/cloudClient/copy";
import { CLOUD_UPDATING_MESSAGE } from "@/lib/cloudClient/contract";

export function CloudUpdatingState({ message = CLOUD_UPDATING_MESSAGE }: { message?: string }) {
  return (
    <Alert>
      <RefreshCw className="h-4 w-4" />
      <AlertTitle>{CLOUD_UPDATING_HEADING}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
