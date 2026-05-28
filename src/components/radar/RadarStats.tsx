import { useEffect, useState } from "react";

interface CounterProps {
  value: number;
  label: string;
  sublabel?: string;
}

function Counter({ value, label, sublabel }: CounterProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 1200;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <div className="flex flex-col gap-1 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.03] p-4 transition-colors hover:border-cyan-400/30">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-200/60">
        {label}
      </div>
      <div className="font-display text-3xl font-bold tabular-nums text-cyan-50 md:text-4xl">
        {display.toLocaleString()}
      </div>
      {sublabel && (
        <div className="text-[11.5px] text-cyan-200/40">{sublabel}</div>
      )}
    </div>
  );
}

interface RadarStatsProps {
  total: number;
  organizations: number;
  countries: number;
}

export function RadarStats({ total, organizations, countries }: RadarStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Counter value={total} label="Deployments" sublabel="active signals" />
      <Counter value={organizations} label="Showcase orgs" sublabel="public profiles" />
      <Counter value={countries} label="Countries" sublabel="and territories" />
    </div>
  );
}
