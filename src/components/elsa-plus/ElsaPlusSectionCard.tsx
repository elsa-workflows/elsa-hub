import { Link } from "react-router-dom";
import { LucideIcon, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ElsaPlusCardItem {
  title: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  comingSoon?: boolean;
}

interface ElsaPlusSectionCardProps {
  title: string;
  intro: string;
  cards: ElsaPlusCardItem[];
  className?: string;
}

function ItemCard({ item }: { item: ElsaPlusCardItem }) {
  const Icon = item.icon;
  
  const cardContent = (
    <Card
      variant="glass"
      className={cn(
        "h-full transition-all duration-300",
        item.href
          ? "hover:border-primary/50 hover:shadow-md cursor-pointer group"
          : "opacity-90"
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold">{item.title}</h3>
              {item.comingSoon && (
                <Badge variant="secondary" className="text-xs">
                  Coming Soon
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {item.description}
            </p>
            {item.href && (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary mt-3 group-hover:gap-2 transition-all">
                Learn more
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (item.href) {
    return <Link to={item.href}>{cardContent}</Link>;
  }

  return cardContent;
}

export function ElsaPlusSectionCard({
  title,
  intro,
  cards,
  className,
}: ElsaPlusSectionCardProps) {
  return (
    <div className={cn("py-12 md:py-16", className)}>
      <div className="container">
        <div className="max-w-3xl mb-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">{title}</h2>
          <p className="text-muted-foreground text-lg">{intro}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <ItemCard key={card.title} item={card} />
          ))}
        </div>
      </div>
    </div>
  );
}
