import { cn } from "@/lib/utils";

interface NeutralityDisclaimerProps {
  className?: string;
}

export function NeutralityDisclaimer({ className }: NeutralityDisclaimerProps) {
  return (
    <div
      className={cn(
        "bg-muted/50 border rounded-lg p-6 text-sm text-muted-foreground",
        className
      )}
    >
      <p>
        Commercial services listed on this website are provided by independent
        companies. These services are not affiliated with or endorsed by the .NET
        Foundation. Elsa Workflows remains fully open source and vendor-neutral.
      </p>
    </div>
  );
}
