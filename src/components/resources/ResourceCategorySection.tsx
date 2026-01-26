import { LucideIcon } from "lucide-react";
import { CommunityResource, CommunityResourceCard } from "./CommunityResourceCard";

interface ResourceCategorySectionProps {
  id: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  resources: CommunityResource[];
}

export function ResourceCategorySection({
  id,
  title,
  description,
  icon: Icon,
  resources,
}: ResourceCategorySectionProps) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map((resource) => (
          <CommunityResourceCard key={resource.href} resource={resource} />
        ))}
      </div>
    </section>
  );
}
