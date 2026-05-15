import { FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  showIcon?: boolean;
  label?: string;
}

/**
 * Consistent "Preview" signal for every Runtime Builder entry point.
 * The Runtime Builder ships as a public preview running on sample
 * catalog data — this badge sets that expectation up-front.
 */
export function PreviewBadge({ className, showIcon = true, label = "Preview" }: Props) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300",
        "text-[10px] font-medium uppercase tracking-wider",
        className,
      )}
    >
      {showIcon && <FlaskConical className="mr-1 h-3 w-3" />}
      {label}
    </Badge>
  );
}
