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
  ariaLabel,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={cn(
        "rounded-full border px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.16em] transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "focus-visible:ring-primary focus-visible:ring-offset-white dark:focus-visible:ring-primary/70 dark:focus-visible:ring-offset-[#03060f]",
        active
          ? [
              "border-primary/70 bg-primary text-primary-foreground shadow-[0_0_12px_-4px_hsl(var(--primary)/0.45)]",
              "dark:border-primary dark:bg-primary dark:text-primary-foreground dark:shadow-[0_0_14px_-3px_hsl(var(--primary)/0.6)]",
            ]
          : [
              "border-slate-200 bg-white text-slate-600 hover:border-sky-400/60 hover:text-sky-700",
              "dark:border-cyan-400/15 dark:bg-transparent dark:text-cyan-200/60 dark:hover:border-cyan-400/40 dark:hover:text-cyan-100",
            ],
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
    <nav aria-label="Radar filters" className="space-y-4">
      {/* Mobile collapse toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-cyan-400/20 dark:bg-cyan-400/[0.04] dark:text-cyan-100 dark:focus-visible:ring-primary/70 lg:hidden"
        aria-expanded={open}
        aria-controls="radar-filter-groups"
        aria-label={`${open ? "Hide" : "Show"} filters${activeCount ? `, ${activeCount} active` : ""}`}
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          Filters
          {activeCount > 0 && (
            <span
              className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary dark:bg-primary/25 dark:text-primary-foreground"
              aria-hidden="true"
            >
              {activeCount}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {/* Always-visible compact controls */}
      <div role="group" aria-label="Display mode" className="flex flex-wrap gap-1.5">
        <Chip active={!heatmap} onClick={() => onHeatmap(false)} ariaLabel="Show individual markers">
          Markers
        </Chip>
        <Chip active={heatmap} onClick={() => onHeatmap(true)} ariaLabel="Show density heatmap">
          Heatmap
        </Chip>
        <span className="mx-1 hidden h-6 w-px self-center bg-slate-200 dark:bg-white/10 sm:inline-block" aria-hidden="true" />
        <Chip active={!showcaseOnly} onClick={() => onShowcaseOnly(false)} ariaLabel="Show all signals">
          All signals
        </Chip>
        <Chip active={showcaseOnly} onClick={() => onShowcaseOnly(true)} ariaLabel="Show showcase deployments only">
          Showcase
        </Chip>
      </div>

      {/* Expandable groups */}
      <div id="radar-filter-groups" className={cn("space-y-5", !open && "hidden lg:block")}>
        <div role="group" aria-labelledby="radar-region-label">
          <div
            id="radar-region-label"
            className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500 dark:text-cyan-200/50"
          >
            Region
          </div>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:flex-wrap lg:overflow-visible">
            <Chip active={region === null} onClick={() => onRegion(null)} ariaLabel="All regions">
              All
            </Chip>
            {elsaRegions.map((r) => (
              <Chip
                key={r}
                active={region === r}
                onClick={() => onRegion(r)}
                ariaLabel={`Filter by region: ${r}`}
              >
                {r}
              </Chip>
            ))}
          </div>
        </div>

        <div role="group" aria-labelledby="radar-industry-label">
          <div
            id="radar-industry-label"
            className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500 dark:text-cyan-200/50"
          >
            Industry
          </div>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:flex-wrap lg:overflow-visible">
            <Chip active={industry === null} onClick={() => onIndustry(null)} ariaLabel="All industries">
              All
            </Chip>
            {elsaIndustries.map((i) => (
              <Chip
                key={i}
                active={industry === i}
                onClick={() => onIndustry(i)}
                ariaLabel={`Filter by industry: ${i}`}
              >
                {i}
              </Chip>
            ))}
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-slate-500 dark:text-cyan-200/40">
          Heatmap aggregates anonymous signals into hex bins to reveal regional intensity.
        </p>

        <div
          className="flex items-center gap-4 border-t border-slate-200 pt-4 text-[11px] text-slate-600 dark:border-white/5 dark:text-cyan-200/50"
          aria-label="Marker legend"
          role="group"
        >
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-sky-500 dark:bg-cyan-300/80" aria-hidden="true" />
            Anonymous
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full bg-primary shadow-[0_0_6px_rgba(192,38,211,0.6)] dark:bg-primary-foreground dark:shadow-[0_0_6px_rgba(240,171,252,0.8)]"
              aria-hidden="true"
            />
            Showcase
          </div>
        </div>
      </div>
    </nav>
  );
}
