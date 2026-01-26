import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Video, BookOpen, GraduationCap, Shield } from "lucide-react";

export interface CommunityResource {
  title: string;
  description: string;
  href: string;
  source: string;
  author?: string;
  date?: string;
  type: "article" | "video" | "tutorial" | "official";
  legacy?: boolean;
}

const typeConfig = {
  article: { label: "Article", icon: BookOpen, variant: "secondary" as const },
  video: { label: "Video", icon: Video, variant: "default" as const },
  tutorial: { label: "Tutorial", icon: GraduationCap, variant: "secondary" as const },
  official: { label: "Official", icon: Shield, variant: "outline" as const },
};

interface CommunityResourceCardProps {
  resource: CommunityResource;
}

export function CommunityResourceCard({ resource }: CommunityResourceCardProps) {
  const config = typeConfig[resource.type];
  const TypeIcon = config.icon;

  return (
    <a
      href={resource.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group block h-full"
    >
      <Card className="h-full hover:border-primary/50 transition-all hover:shadow-lg">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant={config.variant} className="gap-1">
                <TypeIcon className="h-3 w-3" />
                {config.label}
              </Badge>
              {resource.legacy && (
                <Badge variant="outline" className="text-muted-foreground">
                  Legacy v2
                </Badge>
              )}
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </div>

          <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
            {resource.title}
          </h3>

          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {resource.description}
          </p>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">{resource.source}</span>
            {resource.author && (
              <>
                <span>•</span>
                <span>{resource.author}</span>
              </>
            )}
            {resource.date && (
              <>
                <span>•</span>
                <span>{resource.date}</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </a>
  );
}
