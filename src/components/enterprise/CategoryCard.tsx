import { Link } from "react-router-dom";
import { ArrowRight, LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CategoryCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  comingSoon?: boolean;
}

export function CategoryCard({
  title,
  description,
  icon: Icon,
  href,
  comingSoon = false,
}: CategoryCardProps) {
  return (
    <Link to={href} className="group block">
      <Card
        variant="glass"
        className={cn(
          "h-full transition-all duration-200",
          comingSoon
            ? "opacity-70"
            : "hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
        )}
      >
        <CardContent className="p-8 flex flex-col items-center text-center">
          <div
            className={cn(
              "h-16 w-16 rounded-full flex items-center justify-center mb-5",
              comingSoon ? "bg-muted" : "bg-primary/10"
            )}
          >
            <Icon
              className={cn(
                "h-8 w-8",
                comingSoon ? "text-muted-foreground" : "text-primary"
              )}
            />
          </div>

          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-semibold">{title}</h3>
            {comingSoon && (
              <Badge variant="secondary" className="text-xs">
                Coming Soon
              </Badge>
            )}
          </div>

          <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
            {description}
          </p>

          <span
            className={cn(
              "text-sm font-medium inline-flex items-center gap-1 transition-all",
              comingSoon
                ? "text-muted-foreground"
                : "text-primary group-hover:gap-2"
            )}
          >
            {comingSoon ? "Learn more" : "View providers"}
            <ArrowRight className="h-4 w-4" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
