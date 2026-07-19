import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Headphones } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AvailabilityStatusBadge } from "./AvailabilityStatusBadge";
import { providerBrandAssets } from "./providerBrandAssets";
import { useIsDark } from "@/hooks/use-is-dark";
import { cn } from "@/lib/utils";

export interface ProviderTileData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  availability_status: string | null;
  estimated_lead_time_days: number | null;
  booking_url?: string | null;
}

interface ProviderTileProps {
  provider: ProviderTileData;
  tagline?: string;
}

export function ProviderTile({
  provider,
  tagline = "Expert advisory, engineering & priority support for Elsa Workflows",
}: ProviderTileProps) {
  const isDark = useIsDark();
  const brand = providerBrandAssets[provider.slug];
  const wordmark = brand ? (isDark ? brand.logoDark : brand.logoLight) : provider.logo_url;
  const mark = brand?.mark;
  const detailHref = `/elsa-plus/expert-services/${provider.slug}`;
  const accentFrom = brand?.accentFrom ?? "from-primary/10";
  const accentTo = brand?.accentTo ?? "to-transparent";

  return (
    <Card
      variant="glass"
      className="group relative overflow-hidden flex flex-col transition-all hover:border-primary/60 hover:shadow-lg"
    >
      {/* Overlay link — sits behind explicit buttons */}
      <Link
        to={detailHref}
        aria-label={`View ${provider.name} details`}
        className="absolute inset-0 z-0"
      />

      {/* Brand canvas */}
      <div
        className={cn(
          "relative overflow-hidden border-b bg-gradient-to-br",
          accentFrom,
          accentTo,
          wide
            ? "aspect-[5/3] w-full md:aspect-square md:w-2/5 md:border-b-0 md:border-r"
            : "aspect-[5/3] w-full",
        )}
      >
        {mark && (
          <img
            src={mark}
            alt=""
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 opacity-[0.06] dark:opacity-[0.08]"
          />
        )}
        <div className="relative flex h-full w-full items-center justify-center p-8">
          {wordmark ? (
            <img
              src={wordmark}
              alt={`${provider.name} logo`}
              className="max-h-16 md:max-h-20 w-auto max-w-[75%] object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Headphones className="h-10 w-10" />
              <span className="text-lg font-semibold text-foreground">
                {provider.name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Meta + actions */}
      <div className={cn(
        "relative z-10 flex flex-1 flex-col gap-4 p-6",
        wide && "md:justify-center",
      )}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold leading-tight group-hover:text-primary transition-colors">
              {provider.name}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {tagline}
            </p>
          </div>
          <AvailabilityStatusBadge
            status={provider.availability_status}
            estimatedLeadTimeDays={provider.estimated_lead_time_days}
          />
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2">
          <Button asChild size="sm" className="relative z-10 gap-1.5">
            <Link to={detailHref}>
              View details
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          {provider.booking_url && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="relative z-10 gap-1.5"
            >
              <a
                href={provider.booking_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <Calendar className="h-3.5 w-3.5" />
                Book intro
              </a>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
