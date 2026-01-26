import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GuideNavigationProps {
  prevHref?: string;
  prevLabel?: string;
  nextHref?: string;
  nextLabel?: string;
}

export function GuideNavigation({
  prevHref,
  prevLabel,
  nextHref,
  nextLabel,
}: GuideNavigationProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-8 border-t">
      {prevHref && prevLabel ? (
        <Button variant="ghost" asChild>
          <Link to={prevHref} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {prevLabel}
          </Link>
        </Button>
      ) : (
        <div />
      )}
      {nextHref && nextLabel && (
        <Button asChild>
          <Link to={nextHref} className="gap-2">
            {nextLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      )}
    </div>
  );
}
