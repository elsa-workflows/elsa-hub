import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Radar, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { GlobeRadar } from "@/components/radar/GlobeRadar";
import { LocationCard } from "@/components/radar/LocationCard";
import { RadarStats } from "@/components/radar/RadarStats";
import { RadarFilters } from "@/components/radar/RadarFilters";
import {
  elsaUsageLocations,
  type ElsaUsageLocation,
} from "@/data/elsaUsageLocations";

export default function RadarMap() {
  const [region, setRegion] = useState<string | null>(null);
  const [industry, setIndustry] = useState<string | null>(null);
  const [showcaseOnly, setShowcaseOnly] = useState(false);
  const [selected, setSelected] = useState<ElsaUsageLocation | null>(null);

  const filtered = useMemo(() => {
    return elsaUsageLocations.filter((l) => {
      if (region && l.region !== region) return false;
      if (industry && l.industry !== industry) return false;
      if (showcaseOnly && l.anonymous) return false;
      return true;
    });
  }, [region, industry, showcaseOnly]);

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

      {/* Dark scoped wrapper */}
      <div className="relative min-h-screen overflow-hidden bg-[#03060f] text-cyan-50">
        {/* Ambient backdrop */}
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(125,211,252,0.10), transparent 60%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(240,171,252,0.10), transparent 60%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #7dd3fc 1px, transparent 1px), linear-gradient(to bottom, #7dd3fc 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage:
              "radial-gradient(ellipse 80% 70% at 50% 30%, black 30%, transparent 90%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 70% at 50% 30%, black 30%, transparent 90%)",
          }}
        />

        <div className="container relative max-w-7xl py-12 md:py-20">
          {/* Hero */}
          <motion.header
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-10 max-w-3xl"
          >
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-cyan-300/80">
              <Radar className="h-3.5 w-3.5" />
              global radar · community telemetry
            </div>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              Elsa Workflows is running{" "}
              <span className="bg-gradient-to-r from-cyan-200 via-fuchsia-200 to-fuchsia-400 bg-clip-text text-transparent">
                all over the world.
              </span>
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-cyan-100/70">
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
          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="relative"
            >
              <GlobeRadar
                locations={filtered}
                selectedId={selected?.id ?? null}
                onSelect={setSelected}
              />
              <LocationCard location={selected} onClose={() => setSelected(null)} />
            </motion.div>

            <motion.aside
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.02] p-5 lg:sticky lg:top-24 lg:self-start"
            >
              <RadarFilters
                region={region}
                industry={industry}
                showcaseOnly={showcaseOnly}
                onRegion={setRegion}
                onIndustry={setIndustry}
                onShowcaseOnly={setShowcaseOnly}
              />
            </motion.aside>
          </div>

          {/* Privacy strip */}
          <div className="mt-10 flex items-start gap-3 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.03] p-5">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300/80" />
            <div className="text-[13px] leading-relaxed text-cyan-100/70">
              <span className="font-medium text-cyan-50">Privacy first.</span> All participation is
              opt-in. Anonymous markers show approximate regional locations only — no IPs, no
              telemetry, no tracking. Showcase data is voluntarily submitted by teams who want to
              share what they're building.
            </div>
          </div>

          {/* CTA */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="mt-12 overflow-hidden rounded-2xl border border-fuchsia-400/25 bg-gradient-to-br from-fuchsia-500/10 via-transparent to-cyan-500/10 p-8 md:p-12"
          >
            <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-fuchsia-300/80">
                  Join the radar
                </div>
                <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">
                  Add your team to the map.
                </h2>
                <p className="mt-3 text-[14.5px] leading-relaxed text-cyan-100/70">
                  Building something interesting with Elsa? Share a short profile and we'll add you
                  as a showcase deployment. Anonymous teams stay anonymous — no pressure.
                </p>
              </div>
              <Button
                asChild
                size="lg"
                className="bg-fuchsia-400/90 text-[#03060f] hover:bg-fuchsia-300"
              >
                <Link to="/contact">
                  Submit your team
                  <ArrowUpRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </motion.section>
        </div>
      </div>
    </Layout>
  );
}
