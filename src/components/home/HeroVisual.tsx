import { Workflow, Code2, Zap, Eye, Layers, Puzzle, GitBranch, Database, Mail, CheckCircle2 } from "lucide-react";

/**
 * HeroVisual — animated stylized workflow graph.
 * Pure SVG + CSS. Uses theme tokens (hsl(var(--primary)) / --border / --muted-foreground).
 * Replaces the old HeroVideo with something on-brand and lightweight.
 */
export function HeroVisual() {
  const nodes: Array<{ id: string; label: string; icon: typeof Workflow; x: number; y: number; accent?: boolean }> = [
    { id: "start", label: "Trigger",  icon: Zap,           x: 6,  y: 50, accent: true },
    { id: "n1",    label: "Validate", icon: CheckCircle2,  x: 26, y: 28 },
    { id: "n2",    label: "Branch",   icon: GitBranch,     x: 26, y: 72 },
    { id: "n3",    label: "Persist",  icon: Database,      x: 50, y: 28 },
    { id: "n4",    label: "Notify",   icon: Mail,          x: 50, y: 72 },
    { id: "n5",    label: "Compose",  icon: Code2,         x: 74, y: 50 },
    { id: "end",   label: "Complete", icon: Workflow,      x: 94, y: 50, accent: true },
  ];

  const edges: Array<[string, string]> = [
    ["start", "n1"], ["start", "n2"],
    ["n1", "n3"], ["n2", "n4"],
    ["n3", "n5"], ["n4", "n5"],
    ["n5", "end"],
  ];

  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));

  return (
    <div className="hero-screenshot-wrapper max-w-[900px]">
      <div className="screenshot-frame hero-screenshot-frame rounded-xl p-4 md:p-6 relative overflow-hidden">
        {/* Soft gradient wash inside the frame */}
        <div
          className="absolute inset-0 opacity-70 pointer-events-none"
          style={{
            background:
              "radial-gradient(60% 80% at 15% 20%, hsl(var(--primary) / 0.10), transparent 60%), radial-gradient(50% 70% at 85% 90%, hsl(200 80% 55% / 0.08), transparent 60%)",
          }}
        />

        <svg
          viewBox="0 0 100 60"
          className="relative w-full h-auto block"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Animated diagram of an Elsa workflow flowing from trigger to completion"
        >
          <defs>
            <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="hsl(var(--border))" stopOpacity="0.6" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
            </linearGradient>
            <radialGradient id="nodeAccent" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="hsl(var(--primary))" stopOpacity="0.25" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Edges */}
          {edges.map(([from, to], i) => {
            const a = byId[from], b = byId[to];
            const midX = (a.x + b.x) / 2;
            const d = `M ${a.x} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x} ${b.y}`;
            return (
              <g key={`${from}-${to}`}>
                <path d={d} fill="none" stroke="url(#edgeGrad)" strokeWidth="0.4" />
                {/* Traveling pulse */}
                <circle r="0.7" fill="hsl(var(--primary))">
                  <animateMotion dur="3s" repeatCount="indefinite" begin={`${i * 0.35}s`} path={d} />
                  <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur="3s" begin={`${i * 0.35}s`} repeatCount="indefinite" />
                </circle>
              </g>
            );
          })}

          {/* Node halos for accent nodes */}
          {nodes.filter(n => n.accent).map(n => (
            <circle key={`halo-${n.id}`} cx={n.x} cy={n.y} r="6" fill="url(#nodeAccent)" />
          ))}
        </svg>

        {/* HTML node overlay positioned over the SVG via percentages */}
        <div className="absolute inset-0 p-4 md:p-6 pointer-events-none">
          <div className="relative w-full h-full">
            {nodes.map((n, i) => {
              const Icon = n.icon;
              return (
                <div
                  key={n.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2 animate-fade-in-up"
                  style={{ left: `${n.x}%`, top: `${(n.y / 60) * 100}%`, animationDelay: `${i * 80}ms` }}
                >
                  <div
                    className={[
                      "flex items-center gap-2 rounded-full border bg-card/95 backdrop-blur px-3 py-1.5",
                      "shadow-md transition-transform",
                      n.accent ? "border-primary/40" : "border-border",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex h-6 w-6 items-center justify-center rounded-full",
                        n.accent ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/80",
                      ].join(" ")}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-xs font-medium tracking-tight whitespace-nowrap">
                      {n.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer chip row — gives the frame a "product surface" feel */}
        <div className="relative mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="font-mono">workflow.run</span>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> Observable</span>
            <span className="inline-flex items-center gap-1"><Layers className="h-3 w-3" /> Multi-tenant</span>
            <span className="inline-flex items-center gap-1"><Puzzle className="h-3 w-3" /> Extensible</span>
          </div>
        </div>
      </div>
    </div>
  );
}
