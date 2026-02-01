import { Link } from "react-router-dom";
import { ArrowRight, LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PathCardProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  description: string;
  bestFor: string[];
  href: string;
  cta: string;
  badge?: string;
}

export function PathCard({
  icon: Icon,
  title,
  subtitle,
  description,
  bestFor,
  href,
  cta,
  badge,
}: PathCardProps) {
  return (
    <Link to={href} className="group block">
      <Card variant="glass" className="h-full hover:border-primary/50 transition-all hover:shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between mb-3">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Icon className="h-7 w-7 text-primary" />
            </div>
            {badge && (
              <Badge variant="secondary" className="text-xs">
                {badge}
              </Badge>
            )}
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <p className="text-sm font-medium text-primary">{subtitle}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{description}</p>
          <div>
            <p className="text-sm font-medium mb-2">Best for:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {bestFor.map((item, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <span className="text-base font-medium text-primary inline-flex items-center gap-2 group-hover:gap-3 transition-all">
            {cta}
            <ArrowRight className="h-5 w-5" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
