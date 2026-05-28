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
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-200/50">
          Region
        </div>
        <div className="flex flex-wrap gap-1.5">
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
        <div className="flex flex-wrap gap-1.5">
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

      <div>
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-200/50">
          Visibility
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={!showcaseOnly} onClick={() => onShowcaseOnly(false)}>
            All signals
          </Chip>
          <Chip active={showcaseOnly} onClick={() => onShowcaseOnly(true)}>
            Showcase only
          </Chip>
        </div>
      </div>

      <div>
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-200/50">
          Density
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={!heatmap} onClick={() => onHeatmap(false)}>
            Markers
          </Chip>
          <Chip active={heatmap} onClick={() => onHeatmap(true)}>
            Heatmap
          </Chip>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-cyan-200/40">
          Aggregates anonymous signals into hex bins to reveal regional intensity.
        </p>
      </div>

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
  );
}
