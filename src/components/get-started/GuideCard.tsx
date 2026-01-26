import { Link } from "react-router-dom";
import { ArrowRight, LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface GuideCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  bestFor: string[];
  href: string;
  badge?: string;
}

export function GuideCard({
  icon: Icon,
  title,
  description,
  bestFor,
  href,
  badge,
}: GuideCardProps) {
  return (
    <Link to={href} className="group block">
      <Card className="h-full hover:border-primary/50 transition-all hover:shadow-lg">
        <CardHeader>
          <div className="flex items-start justify-between mb-2">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            {badge && (
              <Badge variant="secondary" className="text-xs">
                {badge}
              </Badge>
            )}
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{description}</p>
          <div>
            <p className="text-sm font-medium mb-2">Best for:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {bestFor.map((item, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <span className="text-sm font-medium text-primary inline-flex items-center gap-1 group-hover:gap-2 transition-all">
            View Guide
            <ArrowRight className="h-4 w-4" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
