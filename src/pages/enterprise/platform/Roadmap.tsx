import { Seo } from "@/components/Seo";
import { ElsaPlusDisclaimer } from "@/components/elsa-plus";
import { PlatformShell, InteractiveRoadmap } from "./shared";

export default function PlatformRoadmap() {
  return (
    <PlatformShell
      pageTitle="Roadmap"
      seo={
        <Seo
          path="/elsa-plus/platform/roadmap"
          title="Roadmap — Elsa Platform"
          description="Three phases of Elsa Platform: Foundation (deployment loop), Enterprise (trust, supply chain, GitOps), and Platform Engineering (fleet-scale reconciliation)."
        />
      }
    >
      <header className="mb-10">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Roadmap
        </div>
        <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
          Three phases. One control plane.
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground text-lg">
          From a foundational deployment loop to fleet-scale platform engineering — built additively,
          with stable contracts at each phase.
        </p>
      </header>

      <InteractiveRoadmap />

      <div className="mt-12">
        <ElsaPlusDisclaimer />
      </div>
    </PlatformShell>
  );
}
