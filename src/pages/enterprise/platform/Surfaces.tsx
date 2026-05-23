import { Card, CardContent } from "@/components/ui/card";
import { Seo } from "@/components/Seo";
import { ElsaPlusDisclaimer } from "@/components/elsa-plus";
import { PlatformShell, pillars, StatusBadge } from "./shared";

export default function Surfaces() {
  return (
    <PlatformShell
      pageTitle="Surfaces"
      seo={
        <Seo
          path="/elsa-plus/platform/surfaces"
          title="Surfaces — Elsa Platform"
          description="Eight surfaces of Elsa Platform: package catalog, runtime builder, deployments, targets, managed runtimes, runtime operations, audit, and AI assistants."
        />
      }
    >
      <header className="mb-10">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Platform surface
        </div>
        <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
          One Elsa story, eight surfaces.
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground text-lg">
          From governed packages and runtime composition, through safe deployment to targets and
          managed runtimes, to day-two operations, audit, and AI assistants — all parts of one Elsa
          Platform.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {pillars.map((p) => {
          const Icon = p.icon;
          return (
            <Card key={p.title} variant="glass" className="h-full">
              <CardContent className="flex h-full flex-col gap-5 p-6">
                <div className="flex items-start justify-between">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <StatusBadge status={p.status} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{p.title}</h3>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    {p.sub}
                  </p>
                </div>
                <ul className="space-y-1.5 text-[13.5px] text-foreground/85">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary/70" />
                      {pt}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-12">
        <ElsaPlusDisclaimer />
      </div>
    </PlatformShell>
  );
}
