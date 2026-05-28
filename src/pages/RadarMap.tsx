import { useMemo, useState } from "react";
import { ArrowUpRight, Radar, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { GlobeRadar } from "@/components/radar/GlobeRadar";
import { LocationCard } from "@/components/radar/LocationCard";
import { RadarStats } from "@/components/radar/RadarStats";
import { RadarFilters } from "@/components/radar/RadarFilters";
import { AddTeamDialog } from "@/components/radar/AddTeamDialog";
import { type ElsaUsageLocation } from "@/data/elsaUsageLocations";
import { useRadarLocations } from "@/hooks/useRadarLocations";

export default function RadarMap() {
  const [region, setRegion] = useState<string | null>(null);
  const [industry, setIndustry] = useState<string | null>(null);
  const [showcaseOnly, setShowcaseOnly] = useState(false);
  const [heatmap, setHeatmap] = useState(false);
  const [selected, setSelected] = useState<ElsaUsageLocation | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const { data: locations = [] } = useRadarLocations();

  const filtered = useMemo(() => {
    return locations.filter((l) => {
      if (region && l.region !== region) return false;
      if (industry && l.industry !== industry) return false;
      if (showcaseOnly && l.anonymous) return false;
      return true;
    });
  }, [locations, region, industry, showcaseOnly]);

  const stats = useMemo(() => {
    const countries = new Set(filtered.map((l) => l.country));
    const orgs = filtered.filter((l) => !l.anonymous).length;
    return {
      total: filtered.length,
      organizations: orgs,
      countries: countries.size,
    };
  }, [filtered]);

  return (
    <Layout>
      <Seo
        path="/community/radar"
        title="Global Radar — Elsa Workflows around the world"
        description="A live radar of Elsa Workflows deployments across the world. Anonymous by default, opt-in showcases for teams that want to share what they're building."
      />

      {/* Theme-aware scoped wrapper */}
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-sky-50/60 via-white to-slate-50 text-slate-900 dark:bg-[#03060f] dark:bg-none dark:text-cyan-50">
        {/* Ambient backdrop */}
        <div
          className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-60"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 0%, hsla(199,89%,60%,0.10), transparent 60%), radial-gradient(ellipse 60% 40% at 80% 100%, hsla(292,84%,65%,0.10), transparent 60%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05] dark:opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            color: "var(--radar-grid, hsl(199 89% 48%))",
            maskImage:
              "radial-gradient(ellipse 80% 70% at 50% 30%, black 30%, transparent 90%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 70% at 50% 30%, black 30%, transparent 90%)",
          }}
        />

        <div className="container relative max-w-7xl px-4 py-8 sm:px-6 sm:py-12 md:py-20">
          {/* Hero */}
          <motion.header
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 max-w-3xl sm:mb-10"
          >
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-sky-700/90 dark:text-cyan-300/80 sm:text-[11px]">
              <Radar className="h-3.5 w-3.5" />
              global radar · community telemetry
            </div>
            <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:mt-4 sm:text-4xl md:text-5xl">
              Elsa Workflows is running{" "}
              <span className="bg-gradient-to-r from-sky-600 via-primary to-primary bg-clip-text text-transparent dark:from-cyan-200 dark:via-primary-foreground dark:to-primary">
                all over the world.
              </span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-cyan-100/70 sm:mt-5 sm:text-lg">
              A live, opt-in view of where teams are building durable workflow systems with Elsa.
              Anonymous by default — public showcases for the teams that want to share what they're
              building.
            </p>
          </motion.header>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            <RadarStats
              total={stats.total}
              organizations={stats.organizations}
              countries={stats.countries}
            />
          </motion.div>

          {/* Globe + Filters */}
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_280px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="relative order-2 self-start lg:order-1"
            >
              <GlobeRadar
                locations={filtered}
                selectedId={selected?.id ?? null}
                onSelect={setSelected}
                heatmap={heatmap && !showcaseOnly}
              />
              <LocationCard location={selected} onClose={() => setSelected(null)} />
            </motion.div>

            <motion.aside
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="order-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-cyan-400/15 dark:bg-cyan-400/[0.02] dark:shadow-none sm:p-5 lg:order-2 lg:sticky lg:top-24 lg:self-start"
            >
              <RadarFilters
                region={region}
                industry={industry}
                showcaseOnly={showcaseOnly}
                heatmap={heatmap}
                onRegion={setRegion}
                onIndustry={setIndustry}
                onShowcaseOnly={setShowcaseOnly}
                onHeatmap={setHeatmap}
              />
            </motion.aside>
          </div>

          {/* Privacy strip */}
          <div className="mt-10 flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-cyan-400/15 dark:bg-cyan-400/[0.03] dark:shadow-none">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-cyan-300/80" />
            <div className="text-[13px] leading-relaxed text-slate-600 dark:text-cyan-100/70">
              <span className="font-medium text-slate-900 dark:text-cyan-50">Privacy first.</span>{" "}
              All participation is opt-in. Anonymous markers show approximate regional locations
              only — no IPs, no telemetry, no tracking. Showcase data is voluntarily submitted by
              teams who want to share what they're building.
            </div>
          </div>

          {/* CTA */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="mt-12 overflow-hidden rounded-2xl border border-primary-foreground/50 bg-gradient-to-br from-primary/5 via-white to-sky-50 p-8 dark:border-primary/30 dark:from-primary/10 dark:via-transparent dark:to-cyan-500/10 md:p-12"
          >
            <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-primary dark:text-primary/80">
                  Join the radar
                </div>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-cyan-50 md:text-3xl">
                  Add your team to the map.
                </h2>
                <p className="mt-3 text-[14.5px] leading-relaxed text-slate-600 dark:text-cyan-100/70">
                  Building something interesting with Elsa? Share a short profile and we'll add you
                  as a showcase deployment. Anonymous teams stay anonymous — no pressure.
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => setAddOpen(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Submit your team
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </motion.section>
        </div>

        <AddTeamDialog open={addOpen} onOpenChange={setAddOpen} />
      </div>
    </Layout>
  );
}
