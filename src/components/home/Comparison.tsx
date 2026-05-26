import { Check, Minus, X } from "lucide-react";

type Cell = "yes" | "partial" | "no" | string;

const columns = ["Elsa", "Temporal", "n8n", "Hand-rolled"] as const;

const rows: { label: string; values: Cell[] }[] = [
  { label: "License", values: ["MIT", "MIT", "Sustainable use", "—"] },
  { label: "Primary language", values: [".NET / C#", "Go / SDKs", "Node / no-code", "Yours"] },
  { label: "Visual designer", values: ["yes", "no", "yes", "no"] },
  { label: "Code-first authoring", values: ["yes", "yes", "partial", "yes"] },
  { label: "Long-running & durable", values: ["yes", "yes", "partial", "no"] },
  { label: "Self-hosted", values: ["yes", "yes", "yes", "yes"] },
  { label: "Pluggable persistence", values: ["yes", "partial", "partial", "yes"] },
  { label: "Built for .NET stacks", values: ["yes", "partial", "no", "yes"] },
  { label: "Cost", values: ["Free / OSS", "Free OSS, paid cloud", "Free / paid tiers", "Your time"] },
];

function renderCell(value: Cell, isElsa: boolean) {
  if (value === "yes") {
    return (
      <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full ${isElsa ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
    );
  }
  if (value === "no") {
    return (
      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-muted text-muted-foreground/50">
        <X className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (value === "partial") {
    return (
      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-muted text-muted-foreground">
        <Minus className="h-3.5 w-3.5" />
      </span>
    );
  }
  return <span className={`text-sm ${isElsa ? "font-medium text-foreground" : "text-muted-foreground"}`}>{value}</span>;
}

export function Comparison() {
  return (
    <section className="py-20 md:py-28 bg-surface-subtle">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            How Elsa compares
          </h2>
          <p className="text-muted-foreground text-lg">
            A factual look at where Elsa sits next to other ways to orchestrate work.
          </p>
        </div>

        <div className="max-w-5xl mx-auto rounded-xl border border-border bg-background overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-subtle/60">
                  <th className="text-left font-medium text-muted-foreground px-4 md:px-6 py-4 w-[28%]">
                    Capability
                  </th>
                  {columns.map((c) => (
                    <th
                      key={c}
                      className={`text-left font-semibold px-4 md:px-6 py-4 ${
                        c === "Elsa" ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.label}
                    className={i % 2 === 1 ? "bg-muted/20" : ""}
                  >
                    <td className="px-4 md:px-6 py-3.5 font-medium">{row.label}</td>
                    {row.values.map((v, j) => (
                      <td key={j} className="px-4 md:px-6 py-3.5">
                        {renderCell(v, columns[j] === "Elsa")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6 max-w-2xl mx-auto">
          Based on each project's public documentation and license files at the time of
          writing. Intentionally high-level — every tool has strengths, pick what fits
          your stack and team.
        </p>
      </div>
    </section>
  );
}
