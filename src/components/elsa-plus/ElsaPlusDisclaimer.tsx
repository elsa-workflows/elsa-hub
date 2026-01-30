import { cn } from "@/lib/utils";

interface ElsaPlusDisclaimerProps {
  className?: string;
}

export function ElsaPlusDisclaimer({ className }: ElsaPlusDisclaimerProps) {
  return (
    <div
      className={cn(
        "bg-muted/50 border rounded-lg p-6 text-sm text-muted-foreground",
        className
      )}
    >
      <p>
        Commercial services and offerings listed under Elsa+ are provided by
        independent companies. Elsa Workflows remains fully open source,
        vendor-neutral, and community-driven.
      </p>
    </div>
  );
}
