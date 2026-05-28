import { useState } from "react";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { elsaIndustries, elsaRegions } from "@/data/elsaUsageLocations";

interface RadarFiltersProps {
  region: string | null;
  industry: string | null;
  showcaseOnly: boolean;
  heatmap: boolean;
  onRegion: (r: string | null) => void;
  onIndustry: (i: string | null) => void;
  onShowcaseOnly: (v: boolean) => void;
  onHeatmap: (v: boolean) => void;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.16em] transition-all",
        active
          ? "border-fuchsia-400/60 bg-fuchsia-400/15 text-fuchsia-100 shadow-[0_0_12px_-2px_rgba(240,171,252,0.5)]"
          : "border-cyan-400/15 bg-transparent text-cyan-200/60 hover:border-cyan-400/40 hover:text-cyan-100",
      )}
    >
      {children}
    </button>
  );
}

export function RadarFilters({
  region,
  industry,
  showcaseOnly,
  heatmap,
  onRegion,
  onIndustry,
  onShowcaseOnly,
  onHeatmap,
}: RadarFiltersProps) {
  const [open, setOpen] = useState(false);
  const activeCount =
    (region ? 1 : 0) + (industry ? 1 : 0) + (showcaseOnly ? 1 : 0) + (heatmap ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Mobile collapse toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-cyan-400/20 bg-cyan-400/[0.04] px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-100 lg:hidden"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-fuchsia-400/20 px-2 py-0.5 text-[10px] text-fuchsia-200">
              {activeCount}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
        />
      </button>

      {/* Always-visible compact controls (mobile + desktop) */}
      <div className="flex flex-wrap gap-1.5">
        <Chip active={!heatmap} onClick={() => onHeatmap(false)}>
          Markers
        </Chip>
        <Chip active={heatmap} onClick={() => onHeatmap(true)}>
          Heatmap
        </Chip>
        <span className="mx-1 hidden h-6 w-px self-center bg-white/10 sm:inline-block" />
        <Chip active={!showcaseOnly} onClick={() => onShowcaseOnly(false)}>
          All signals
        </Chip>
        <Chip active={showcaseOnly} onClick={() => onShowcaseOnly(true)}>
          Showcase
        </Chip>
      </div>

      {/* Expandable groups */}
      <div className={cn("space-y-5", !open && "hidden lg:block")}>
        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-200/50">
            Region
          </div>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:flex-wrap lg:overflow-visible">
            <Chip active={region === null} onClick={() => onRegion(null)}>
              All
            </Chip>
            {elsaRegions.map((r) => (
              <Chip key={r} active={region === r} onClick={() => onRegion(r)}>
                {r}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-200/50">
            Industry
          </div>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:flex-wrap lg:overflow-visible">
            <Chip active={industry === null} onClick={() => onIndustry(null)}>
              All
            </Chip>
            {elsaIndustries.map((i) => (
              <Chip key={i} active={industry === i} onClick={() => onIndustry(i)}>
                {i}
              </Chip>
            ))}
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-cyan-200/40">
          Heatmap aggregates anonymous signals into hex bins to reveal regional intensity.
        </p>

        <div className="flex items-center gap-4 border-t border-white/5 pt-4 text-[11px] text-cyan-200/50">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-300/80" />
            Anonymous
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-fuchsia-300 shadow-[0_0_6px_rgba(240,171,252,0.8)]" />
            Showcase
          </div>
        </div>
      </div>
    </div>
  );
}
