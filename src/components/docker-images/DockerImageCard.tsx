import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DockerImage } from "@/data/dockerImages";

interface DockerImageCardProps {
  image: DockerImage;
}

export function DockerImageCard({ image }: DockerImageCardProps) {
  const Icon = image.icon;
  return (
    <div className="group rounded-lg border bg-card p-6 flex flex-col h-full hover:border-primary/50 hover:shadow-lg transition-all">
      <div className="flex items-start gap-4 mb-4">
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold leading-tight">{image.name}</h3>
          <p className="text-xs font-mono text-muted-foreground mt-1 truncate">{image.image}</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">{image.tagline}</p>

      <ul className="space-y-1.5 text-sm mb-4">
        {image.highlights.map((h) => (
          <li key={h} className="flex gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>{h}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-1.5 mb-5">
        {image.tags.map((t) => (
          <Badge key={t} variant="secondary" className="text-xs">
            {t}
          </Badge>
        ))}
      </div>

      <div className="mt-auto flex items-center gap-2">
        <Button asChild className="gap-2 flex-1">
          <Link to={`/elsa-plus/docker-images/${image.slug}`}>
            View instructions
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="icon" title="Docker Hub">
          <a href={image.dockerHubUrl} target="_blank" rel="noopener noreferrer" aria-label="Docker Hub">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}
