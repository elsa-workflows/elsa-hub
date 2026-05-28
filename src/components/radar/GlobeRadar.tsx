import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import type { ElsaUsageLocation } from "@/data/elsaUsageLocations";
import { useIsDark } from "@/hooks/use-is-dark";
import { useCssVar } from "@/hooks/use-css-var";
import { cn } from "@/lib/utils";

// react-globe.gl is a default export; lazy-load to keep bundle off initial paint
const Globe = lazy(() => import("react-globe.gl").then((m) => ({ default: m.default })));

interface GlobeRadarProps {
  locations: ElsaUsageLocation[];
  onSelect: (loc: ElsaUsageLocation | null) => void;
  selectedId?: string | null;
  heatmap?: boolean;
}

export function GlobeRadar({ locations, onSelect, selectedId, heatmap = false }: GlobeRadarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [ready, setReady] = useState(false);
  const isDark = useIsDark();
  // Active accent palette (e.g. "336 78% 48%"). Drives showcase markers + rings.
  const primaryHsl = useCssVar("--primary") || "336 78% 48%";
  // d3-color (used by react-globe.gl) only parses the legacy comma form of hsla,
  // not the modern "h s% l% / a" syntax — so format explicitly.
  const [pH, pS, pL] = primaryHsl.split(/\s+/);
  const primary = (a = 1) => `hsla(${pH}, ${pS}, ${pL}, ${a})`;
  const primaryHue = Number(pH) || 336;

  // Theme-dependent visuals
  const globeImageUrl = isDark
    ? "//unpkg.com/three-globe/example/img/earth-night.jpg"
    : "//unpkg.com/three-globe/example/img/earth-blue-marble.jpg";
  const atmosphereColor = isDark ? "#7dd3fc" : "#38bdf8";
  const anonymousColor = isDark ? "rgba(125,211,252,0.85)" : "rgba(2,132,199,0.85)";
  const showcaseColor = primary(isDark ? 0.95 : 1);
  const selectedColor = isDark ? "#ffffff" : "#0f172a";
  const labelTextColor = isDark ? "#e2e8f0" : "#0f172a";
  const labelBg = isDark ? "rgba(2,6,23,0.92)" : "rgba(255,255,255,0.96)";
  const labelBorderAnon = isDark ? "rgba(125,211,252,0.3)" : "rgba(2,132,199,0.35)";
  const labelBorderShow = primary(0.45);
  const showcaseHeadColor = primary(isDark ? 0.95 : 1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!globeRef.current || !ready) return;
    const controls = globeRef.current.controls?.();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.35;
      controls.enableZoom = true;
      controls.enableRotate = true;
      controls.enablePan = false;
      controls.minDistance = 180;
      controls.maxDistance = 500;
      controls.rotateSpeed = 0.8;
      controls.zoomSpeed = 0.9;
      controls.touches = { ONE: 0, TWO: 2 };
      const stopAuto = () => { controls.autoRotate = false; };
      controls.addEventListener?.("start", stopAuto);
    }
    const isNarrow = (containerRef.current?.clientWidth ?? 800) < 640;
    globeRef.current.pointOfView?.(
      { lat: 25, lng: 10, altitude: isNarrow ? 2.8 : 2.4 },
      0,
    );
  }, [ready]);

  const showcasePoints = useMemo(() => locations.filter((l) => !l.anonymous), [locations]);

  const ringsData = useMemo(
    () =>
      showcasePoints.map((l) => ({
        lat: l.latitude,
        lng: l.longitude,
        maxR: 5,
        propagationSpeed: 2,
        repeatPeriod: 1600,
      })),
    [showcasePoints],
  );
  const anonymousPoints = useMemo(() => locations.filter((l) => l.anonymous), [locations]);

  const pointsData = useMemo(() => {
    const base = (heatmap ? showcasePoints : locations).map((l) => ({
      ...l,
      lat: l.latitude,
      lng: l.longitude,
      altitude: l.anonymous ? 0.005 : 0.015,
    }));
    // Nudge overlapping showcase markers apart so none get hidden behind another.
    // Two showcases within ~75 km on the globe will collapse to the same pixel
    // at default zoom; fan them out around their shared centroid.
    const SHOWCASE_MIN_DEG = 0.8; // ~88 km
    const showcases = base.filter((d) => !d.anonymous);
    const groups: (typeof showcases)[] = [];
    for (const p of showcases) {
      const g = groups.find((grp) =>
        grp.some(
          (q) =>
            Math.abs(q.lat - p.lat) < SHOWCASE_MIN_DEG &&
            Math.abs(q.lng - p.lng) < SHOWCASE_MIN_DEG,
        ),
      );
      if (g) g.push(p);
      else groups.push([p]);
    }
    for (const g of groups) {
      if (g.length < 2) continue;
      const cLat = g.reduce((s, p) => s + p.lat, 0) / g.length;
      const cLng = g.reduce((s, p) => s + p.lng, 0) / g.length;
      const r = SHOWCASE_MIN_DEG; // spread radius in degrees
      g.forEach((p, i) => {
        const angle = (i / g.length) * Math.PI * 2;
        p.lat = cLat + Math.sin(angle) * r;
        p.lng = cLng + Math.cos(angle) * r;
      });
    }
    return base;
  }, [locations, showcasePoints, heatmap]);


  const hexBinData = useMemo(
    () =>
      anonymousPoints.map((l) => ({
        lat: l.latitude,
        lng: l.longitude,
        weight: l.weight ?? 1,
      })),
    [anonymousPoints],
  );

  const selectedLocation = useMemo(
    () => locations.find((l) => l.id === selectedId) ?? null,
    [locations, selectedId],
  );

  // Ring color: fuchsia (dark) or violet (light), keep both bright enough to see.
  const ringColorFn = useMemo(
    () => () => (t: number) => primary((1 - t) * (isDark ? 1 : 0.85)),
    // primaryHsl is the real dependency — recompute when accent changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDark, primaryHsl],
  );

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Interactive globe showing Elsa Workflows deployments. Use the list below the globe to browse locations with the keyboard."
      className={cn(
        "relative h-[60vh] min-h-[380px] w-full touch-none select-none overflow-hidden rounded-2xl border sm:h-[520px] md:h-[640px]",
        isDark
          ? "border-border bg-[#040814]"
          : "border-slate-200 bg-gradient-to-b from-sky-50 via-white to-slate-50",
      )}
      onMouseEnter={() => {
        const c = globeRef.current?.controls?.();
        if (c) c.autoRotate = false;
      }}
      onMouseLeave={() => {
        const c = globeRef.current?.controls?.();
        if (c && window.matchMedia("(hover: hover)").matches) c.autoRotate = true;
      }}
    >
      {/* Live region announces selection changes to assistive tech */}
      <div role="status" aria-live="polite" className="sr-only">
        {selectedLocation
          ? selectedLocation.anonymous
            ? `Selected anonymous deployment in ${selectedLocation.city ? `${selectedLocation.city}, ` : ""}${selectedLocation.country}`
            : `Selected ${selectedLocation.companyName} in ${selectedLocation.city ? `${selectedLocation.city}, ` : ""}${selectedLocation.country}`
          : ""}
      </div>

      {/* Vignette */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: isDark
            ? "radial-gradient(ellipse at center, transparent 50%, rgba(2,4,12,0.85) 100%)"
            : "radial-gradient(ellipse at center, transparent 55%, rgba(248,250,252,0.85) 100%)",
        }}
      />
      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: isDark ? 0.08 : 0.12,
          backgroundImage: isDark
            ? "linear-gradient(to right, hsl(186 100% 70%) 1px, transparent 1px), linear-gradient(to bottom, hsl(186 100% 70%) 1px, transparent 1px)"
            : "linear-gradient(to right, hsl(199 89% 48%) 1px, transparent 1px), linear-gradient(to bottom, hsl(199 89% 48%) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 80%)",
        }}
      />

      <Suspense fallback={<GlobeSkeleton isDark={isDark} />}>
        <Globe
          ref={globeRef}
          width={size.w}
          height={size.h}
          backgroundColor="rgba(0,0,0,0)"
          showAtmosphere
          atmosphereColor={atmosphereColor}
          atmosphereAltitude={0.18}
          globeImageUrl={globeImageUrl}
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          onGlobeReady={() => setReady(true)}
          // Points
          pointsData={pointsData}
          pointLat="lat"
          pointLng="lng"
          pointAltitude="altitude"
          pointRadius={(d: any) =>
            d.id === selectedId ? 0.55 : d.anonymous ? 0.22 : 0.4
          }
          pointColor={(d: any) =>
            d.id === selectedId
              ? selectedColor
              : d.anonymous
                ? anonymousColor
                : showcaseColor
          }
          pointResolution={6}
          pointLabel={(d: any) =>
            d.anonymous
              ? `<div style="font: 500 12px Inter, sans-serif; color: ${labelTextColor}; background: ${labelBg}; padding: 6px 10px; border: 1px solid ${labelBorderAnon}; border-radius: 6px;">
                  ${d.city ?? ""}${d.city ? ", " : ""}${d.country}
                </div>`
              : `<div style="font: 500 12px Inter, sans-serif; color: ${labelTextColor}; background: ${labelBg}; padding: 8px 12px; border: 1px solid ${labelBorderShow}; border-radius: 6px; min-width: 180px;">
                  <div style="font-weight:600; color:${showcaseHeadColor};">${d.companyName ?? d.country}</div>
                  <div style="opacity:.7; margin-top:2px;">${d.city ?? ""}${d.city ? " · " : ""}${d.country}</div>
                  ${d.industry ? `<div style='opacity:.6; margin-top:4px; font-size:11px;'>${d.industry}</div>` : ""}
                </div>`
          }
          onPointClick={(d: any) => onSelect(d as ElsaUsageLocation)}
          onPointHover={(d: any) => {
            document.body.style.cursor = d ? "pointer" : "default";
          }}
          // Radar rings
          ringsData={ringsData}
          ringColor={ringColorFn}
          ringMaxRadius="maxR"
          ringPropagationSpeed="propagationSpeed"
          ringRepeatPeriod="repeatPeriod"
          // Heatmap
          hexBinPointsData={heatmap ? hexBinData : []}
          hexBinPointLat="lat"
          hexBinPointLng="lng"
          hexBinPointWeight="weight"
          hexBinResolution={3}
          hexMargin={0.2}
          hexAltitude={({ sumWeight }: any) => Math.min(0.18, 0.015 + sumWeight * 0.02)}
          hexTopColor={({ sumWeight }: any) => heatColor(sumWeight, 0.95, isDark, primaryHue)}
          hexSideColor={({ sumWeight }: any) => heatColor(sumWeight, 0.55, isDark, primaryHue)}
          hexLabel={({ sumWeight, points }: any) =>
            `<div style="font: 500 12px Inter, sans-serif; color:${labelTextColor}; background:${labelBg}; padding:6px 10px; border:1px solid ${labelBorderAnon}; border-radius:6px;">
               <div style="color:${isDark ? "#7dd3fc" : "#0284c7"}; font-weight:600;">Density · ${sumWeight.toFixed(0)}</div>
               <div style="opacity:.7; margin-top:2px;">${points.length} anonymous signals</div>
             </div>`
          }
        />
      </Suspense>

      {/* Corner HUD */}
      <div
        className={cn(
          "pointer-events-none absolute left-4 top-4 z-20 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em]",
          isDark ? "text-cyan-200/70" : "text-sky-700/80",
        )}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 animate-pulse rounded-full",
            isDark ? "bg-cyan-300" : "bg-sky-500",
          )}
        />
        live · global radar
      </div>
      <div
        className={cn(
          "pointer-events-none absolute right-4 top-4 z-20 font-mono text-[10px] uppercase tracking-[0.22em]",
          isDark ? "text-cyan-200/60" : "text-slate-500",
        )}
      >
        v1.0 · sample dataset
      </div>
      <div
        className={cn(
          "pointer-events-none absolute bottom-4 right-4 z-20 hidden font-mono text-[10px] uppercase tracking-[0.22em] md:block",
          isDark ? "text-cyan-200/50" : "text-slate-500/80",
        )}
      >
        drag · zoom · click a node
      </div>

      {/* Keyboard-accessible marker list */}
      <ul
        aria-label={`${locations.length} deployment markers. Use Tab and Enter to inspect.`}
        className="sr-only"
      >
        {locations.map((l) => {
          const label = l.anonymous
            ? `Anonymous deployment in ${l.city ? `${l.city}, ` : ""}${l.country}`
            : `${l.companyName ?? "Showcase deployment"} in ${l.city ? `${l.city}, ` : ""}${l.country}${l.industry ? ` — ${l.industry}` : ""}`;
          return (
            <li key={l.id}>
              <button
                type="button"
                aria-pressed={selectedId === l.id}
                onClick={() => onSelect(l)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(l);
                  }
                }}
              >
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function GlobeSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="relative h-48 w-48">
        <div
          className={cn(
            "absolute inset-0 animate-ping rounded-full border",
            isDark ? "border-cyan-400/40" : "border-sky-400/50",
          )}
        />
        <div
          className={cn(
            "absolute inset-4 rounded-full border",
            isDark ? "border-cyan-400/20" : "border-sky-400/25",
          )}
        />
        <div
          className={cn(
            "absolute inset-8 rounded-full border",
            isDark ? "border-cyan-400/10" : "border-sky-400/15",
          )}
        />
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.22em]",
            isDark ? "text-cyan-200/60" : "text-sky-700/70",
          )}
        >
          Initializing
        </div>
      </div>
    </div>
  );
}

// Cyan/Sky → fuchsia/violet gradient based on bin weight (1..15 expected range)
// Cyan/Sky base → active accent hue, based on bin weight (1..15 expected range).
function heatColor(weight: number, alpha: number, isDark: boolean, accentHue: number) {
  const t = Math.min(1, Math.max(0, (weight - 1) / 14));
  if (isDark) {
    const startHue = 186;
    const h = startHue + (accentHue - startHue) * t;
    const s = 100 - 16 * t;
    const l = 70 + 5 * t;
    return `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
  }
  const startHue = 199;
  const h = startHue + (accentHue - startHue) * t;
  const s = 89 - 5 * t;
  const l = 52 + 6 * t;
  return `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
}

