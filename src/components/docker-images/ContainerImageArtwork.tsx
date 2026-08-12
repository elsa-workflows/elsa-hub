import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type ArtworkAccent = "magenta" | "cyan";
export type ArtworkLabelPosition = "top-left" | "top-right";

interface ContainerImageArtworkProps {
  /** CDN url of the cassette artwork. When omitted a restrained placeholder is rendered. */
  src?: string;
  alt: string;
  label: string;
  accent?: ArtworkAccent;
  labelPosition?: ArtworkLabelPosition;
  /** Icon used for the placeholder silhouette when no artwork is available. */
  placeholderIcon?: LucideIcon;
  className?: string;
  /** Lazy-load artwork below the fold. */
  loading?: "lazy" | "eager";
}

/**
 * Renders a container image "cassette" artwork in a fixed 4:3 media area with a
 * radial index band + product identification label drawn on top in HTML/CSS.
 */
export function ContainerImageArtwork({
  src,
  alt,
  label,
  accent = "magenta",
  labelPosition = "top-left",
  placeholderIcon: PlaceholderIcon,
  className,
  loading = "lazy",
}: ContainerImageArtworkProps) {
  const accentClass = accent === "cyan" ? "bg-sky-400/80" : "bg-primary";
  const isLeft = labelPosition === "top-left";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-md bg-[hsl(30_6%_9%)] px-3 py-2",
        className,
      )}
      style={{ aspectRatio: "4 / 3" }}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          className="h-full w-full object-contain transition-[transform,filter] duration-200 ease-out motion-reduce:transition-none group-hover:scale-[1.015] group-hover:contrast-[1.06]"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex h-full w-full items-center justify-center"
        >
          {/* Cassette silhouette placeholder — deliberately subordinate. */}
          <div className="relative flex h-[78%] aspect-square items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <div className="flex h-[76%] aspect-square items-center justify-center rounded-full border border-white/[0.05] bg-white/[0.015]">
              <div className="flex h-[52%] aspect-square items-center justify-center rounded-full border border-white/[0.06]">
                {PlaceholderIcon ? (
                  <PlaceholderIcon className="h-5 w-5 text-white/20" />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Identification overlay: label + radial index band running inward to the disc, ~10 o'clock. */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute flex flex-col",
          isLeft ? "left-[7%] top-[13%] items-start" : "right-[7%] top-[13%] items-end",
        )}
      >
        <span
          className="rounded-[3px] border border-white/10 bg-[hsl(30_5%_13%)]/95 px-1.5 py-[3px] font-sans text-[8px] font-semibold uppercase leading-none tracking-[0.14em] text-[hsl(40_20%_92%)] sm:text-[9px]"
        >
          {label}
        </span>
        <span
          className={cn(
            "mt-[6px] block h-[1.5px] w-[50px] rounded-full opacity-80 transition-opacity duration-200 motion-reduce:transition-none group-hover:opacity-100",
            accentClass,
            isLeft ? "ml-[10px] origin-left rotate-[45deg]" : "mr-[10px] origin-right -rotate-[45deg]",
          )}
        />
      </div>

    </div>
  );
}
