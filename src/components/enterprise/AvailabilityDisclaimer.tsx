import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface AvailabilityDisclaimerProps {
  variant?: "default" | "compact";
  className?: string;
}

export function AvailabilityDisclaimer({ variant = "default", className }: AvailabilityDisclaimerProps) {
  if (variant === "compact") {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        <Info className="h-3 w-3 inline mr-1" />
        Service credits do not guarantee immediate availability. Scheduling is subject to provider capacity.
      </p>
    );
  }

  return (
    <Alert className={cn("border-primary/20 bg-primary/5", className)}>
      <Info className="h-4 w-4" />
      <AlertDescription>
        Service credits represent prepaid access to professional services. Credits do not guarantee 
        immediate availability — scheduling is subject to provider capacity.
      </AlertDescription>
    </Alert>
  );
}
