import { Workflow, Code2, Zap, Eye, Layers, Puzzle, GitBranch, Database, Mail, CheckCircle2 } from "lucide-react";

/**
 * HeroVisual — animated stylized workflow graph on a subtle grid.
 * Edges follow the grid (orthogonal routing) and dock into node anchor points.
 * Pure SVG + CSS, themed via design tokens.
 */
export function HeroVisual() {
  // Grid: 100 x 28 units. Node coords sit on integer grid intersections.
  const VB_W = 100;
  const VB_H = 28;

  const nodes: Array<{ id: string; label: string; icon: typeof Workflow; x: number; y: number; accent?: boolean }> = [
    { id: "start", label: "Trigger",  icon: Zap,          x: 8,  y: 14, accent: true },
    { id: "n1",    label: "Validate", icon: CheckCircle2, x: 28, y: 6 },
    { id: "n2",    label: "Branch",   icon: GitBranch,    x: 28, y: 22 },
    { id: "n3",    label: "Persist",  icon: Database,     x: 52, y: 6 },
    { id: "n4",    label: "Notify",   icon: Mail,         x: 52, y: 22 },
    { id: "n5",    label: "Compose",  icon: Code2,        x: 74, y: 14 },
    { id: "end",   label: "Complete", icon: Workflow,     x: 92, y: 14, accent: true },
  ];

  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));

  // Orthogonal path: exit right of A, run horizontally to mid-x, turn vertically
  // to B's y, then horizontally into B. Uses small rounded corners (arcs).
  const orthoPath = (ax: number, ay: number, bx: number, by: number) => {
    const r = 1.2; // corner radius (grid units)
    const mx = (ax + bx) / 2;
    if (ay === by) {
      return `M ${ax} ${ay} L ${bx} ${by}`;
    }
    const vDir = by > ay ? 1 : -1;
    const h2Dir = bx > mx ? 1 : -1;
    return [
      `M ${ax} ${ay}`,
      `L ${mx - r} ${ay}`,
      `Q ${mx} ${ay} ${mx} ${ay + r * vDir}`,
      `L ${mx} ${by - r * vDir}`,
      `Q ${mx} ${by} ${mx + r * h2Dir} ${by}`,
      `L ${bx} ${by}`,
    ].join(" ");
  };

  // Anchor offset — pill nodes are ~5 units wide in SVG space; dock to their edge.
  const ANCHOR = 4.5;
  const edges: Array<[string, string]> = [
    ["start", "n1"], ["start", "n2"],
    ["n1", "n3"], ["n2", "n4"],
    ["n3", "n5"], ["n4", "n5"],
    ["n5", "end"],
  ];

  const builtEdges = edges.map(([from, to]) => {
    const a = byId[from], b = byId[to];
    const d = orthoPath(a.x + ANCHOR, a.y, b.x - ANCHOR, b.y);
    return { from, to, d };
  });

  return (
    <div className="hero-screenshot-wrapper max-w-[900px]">
      <div className="screenshot-frame hero-screenshot-frame rounded-xl p-4 md:p-6 relative overflow-hidden">
        {/* Grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--border) / 0.55) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--border) / 0.55) 1px, transparent 1px),
              linear-gradient(to right, hsl(var(--border) / 0.25) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--border) / 0.25) 1px, transparent 1px)
            `,
            backgroundSize: "80px 80px, 80px 80px, 16px 16px, 16px 16px",
            backgroundPosition: "-1px -1px, -1px -1px, -1px -1px, -1px -1px",
            maskImage:
              "radial-gradient(ellipse 80% 70% at 50% 50%, black 55%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 70% at 50% 50%, black 55%, transparent 100%)",
            opacity: 0.6,
          }}
        />

        {/* Soft gradient wash */}
        <div
          className="absolute inset-0 opacity-80 pointer-events-none"
          style={{
            background:
              "radial-gradient(60% 80% at 10% 20%, hsl(var(--primary) / 0.10), transparent 60%), radial-gradient(50% 70% at 90% 90%, hsl(200 80% 55% / 0.08), transparent 60%)",
          }}
        />

        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="relative w-full h-auto block"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Animated diagram of an Elsa workflow flowing from trigger to completion"
        >
          <defs>
            <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="hsl(var(--border))" stopOpacity="0.85" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.95" />
            </linearGradient>
            <radialGradient id="nodeAccent" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="hsl(var(--primary))" stopOpacity="0.30" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Edges */}
          {builtEdges.map((e, i) => (
            <g key={`${e.from}-${e.to}`}>
              {/* underlay for slight glow */}
              <path d={e.d} fill="none" stroke="hsl(var(--primary) / 0.18)" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
              <path d={e.d} fill="none" stroke="url(#edgeGrad)" strokeWidth="0.4" strokeLinecap="round" strokeLinejoin="round" />
              {/* Traveling pulse */}
              <circle r="0.75" fill="hsl(var(--primary))">
                <animateMotion dur="3s" repeatCount="indefinite" begin={`${i * 0.35}s`} path={e.d} rotate="auto" />
                <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur="3s" begin={`${i * 0.35}s`} repeatCount="indefinite" />
              </circle>
            </g>
          ))}

          {/* Accent halos */}
          {nodes.filter(n => n.accent).map(n => (
            <circle key={`halo-${n.id}`} cx={n.x} cy={n.y} r="3.5" fill="url(#nodeAccent)" />
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
                  style={{ left: `${n.x}%`, top: `${(n.y / VB_H) * 100}%`, animationDelay: `${i * 80}ms` }}
                >
                  <div
                    className={[
                      "flex items-center gap-2 rounded-full border bg-card/95 backdrop-blur px-3 py-1.5",
                      "shadow-md transition-transform",
                      n.accent ? "border-primary/40 ring-1 ring-primary/20" : "border-border",
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

        {/* Footer chip row */}
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
