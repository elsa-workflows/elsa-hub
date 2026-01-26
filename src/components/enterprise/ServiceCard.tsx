import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ServiceCardProps {
  title: string;
  description: string;
  provider?: string;
  href: string;
  tag?: string;
  tagVariant?: "default" | "secondary" | "outline";
  comingSoon?: boolean;
}

export function ServiceCard({
  title,
  description,
  provider,
  href,
  tag,
  tagVariant = "secondary",
  comingSoon = false,
}: ServiceCardProps) {
  return (
    <Link to={href} className="group block">
      <Card
        className={cn(
          "h-full transition-all",
          comingSoon
            ? "opacity-80"
            : "hover:border-primary/50 hover:shadow-lg"
        )}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-xl">{title}</CardTitle>
            {tag && (
              <Badge variant={tagVariant} className="text-xs shrink-0">
                {tag}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{description}</p>
          
          {provider && (
            <p className="text-sm text-muted-foreground">
              Provided by <span className="font-medium text-foreground">{provider}</span>
            </p>
          )}
          
          <span
            className={cn(
              "text-sm font-medium inline-flex items-center gap-1 transition-all",
              comingSoon
                ? "text-muted-foreground"
                : "text-primary group-hover:gap-2"
            )}
          >
            {comingSoon ? "Learn more" : "View details"}
            <ArrowRight className="h-4 w-4" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
