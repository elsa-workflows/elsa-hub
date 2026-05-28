import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import type { ElsaUsageLocation } from "@/data/elsaUsageLocations";

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
      // Touch: one-finger rotate, two-finger pinch zoom (no pan)
      const THREE = (globeRef.current as any).renderer?.()?.constructor;
      // Numeric values map to THREE.TOUCH.ROTATE = 0, DOLLY_PAN = 2, DOLLY_ROTATE = 3
      controls.touches = { ONE: 0, TWO: 2 };
      // Stop auto-rotate as soon as the user touches/drags
      const stopAuto = () => { controls.autoRotate = false; };
      controls.addEventListener?.("start", stopAuto);
    }
    const isNarrow = (containerRef.current?.clientWidth ?? 800) < 640;
    globeRef.current.pointOfView?.(
      { lat: 25, lng: 10, altitude: isNarrow ? 2.8 : 2.4 },
      0,
    );
  }, [ready]);

  // Generate animated radar rings continuously from active markers
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

  // In heatmap mode, hide anonymous markers (replaced by hex bins) and keep showcases on top.
  const pointsData = useMemo(
    () =>
      (heatmap ? showcasePoints : locations).map((l) => ({
        ...l,
        lat: l.latitude,
        lng: l.longitude,
        altitude: l.anonymous ? 0.005 : 0.015,
      })),
    [locations, showcasePoints, heatmap],
  );

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

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Interactive globe showing Elsa Workflows deployments. Use the list below the globe to browse locations with the keyboard."
      className="relative h-[60vh] min-h-[380px] w-full touch-none select-none overflow-hidden rounded-2xl border border-border bg-[#040814] sm:h-[520px] md:h-[640px]"
      onMouseEnter={() => {
        const c = globeRef.current?.controls?.();
        if (c) c.autoRotate = false;
      }}
      onMouseLeave={() => {
        const c = globeRef.current?.controls?.();
        // Only re-enable auto-rotate on devices that actually use a mouse (skip touch).
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
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(2,4,12,0.85) 100%)",
        }}
      />
      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(186 100% 70%) 1px, transparent 1px), linear-gradient(to bottom, hsl(186 100% 70%) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 80%)",
        }}
      />

      <Suspense fallback={<GlobeSkeleton />}>
        <Globe
          ref={globeRef}
          width={size.w}
          height={size.h}
          backgroundColor="rgba(0,0,0,0)"
          showAtmosphere
          atmosphereColor="#7dd3fc"
          atmosphereAltitude={0.18}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
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
              ? "#ffffff"
              : d.anonymous
                ? "rgba(125,211,252,0.85)"
                : "#f0abfc"
          }
          pointResolution={6}
          pointLabel={(d: any) =>
            d.anonymous
              ? `<div style="font: 500 12px Inter, sans-serif; color: #e2e8f0; background: rgba(2,6,23,0.92); padding: 6px 10px; border: 1px solid rgba(125,211,252,0.3); border-radius: 6px;">
                  ${d.city ?? ""}${d.city ? ", " : ""}${d.country}
                </div>`
              : `<div style="font: 500 12px Inter, sans-serif; color: #fafafa; background: rgba(2,6,23,0.95); padding: 8px 12px; border: 1px solid rgba(240,171,252,0.45); border-radius: 6px; min-width: 180px;">
                  <div style="font-weight:600; color:#f0abfc;">${d.companyName ?? d.country}</div>
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
          ringColor={() => (t: number) => `rgba(240,171,252,${1 - t})`}
          ringMaxRadius="maxR"
          ringPropagationSpeed="propagationSpeed"
          ringRepeatPeriod="repeatPeriod"
          // Heatmap (hex bins of anonymous deployments)
          hexBinPointsData={heatmap ? hexBinData : []}
          hexBinPointLat="lat"
          hexBinPointLng="lng"
          hexBinPointWeight="weight"
          hexBinResolution={3}
          hexMargin={0.2}
          hexAltitude={({ sumWeight }: any) => Math.min(0.18, 0.015 + sumWeight * 0.02)}
          hexTopColor={({ sumWeight }: any) => heatColor(sumWeight, 0.95)}
          hexSideColor={({ sumWeight }: any) => heatColor(sumWeight, 0.55)}
          hexLabel={({ sumWeight, points }: any) =>
            `<div style="font: 500 12px Inter, sans-serif; color:#e2e8f0; background:rgba(2,6,23,0.92); padding:6px 10px; border:1px solid rgba(125,211,252,0.3); border-radius:6px;">
               <div style="color:#7dd3fc; font-weight:600;">Density · ${sumWeight.toFixed(0)}</div>
               <div style="opacity:.7; margin-top:2px;">${points.length} anonymous signals</div>
             </div>`
          }
        />
      </Suspense>

      {/* Corner HUD */}
      <div className="pointer-events-none absolute left-4 top-4 z-20 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-200/70">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />
        live · global radar
      </div>
      <div className="pointer-events-none absolute right-4 top-4 z-20 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-200/60">
        v1.0 · sample dataset
      </div>
      <div className="pointer-events-none absolute bottom-4 right-4 z-20 hidden font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-200/50 md:block">
        drag · zoom · click a node
      </div>
    </div>
  );
}

function GlobeSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="relative h-48 w-48">
        <div className="absolute inset-0 animate-ping rounded-full border border-cyan-400/40" />
        <div className="absolute inset-4 rounded-full border border-cyan-400/20" />
        <div className="absolute inset-8 rounded-full border border-cyan-400/10" />
        <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-200/60">
          Initializing
        </div>
      </div>
    </div>
  );
}

// Cyan → fuchsia gradient based on bin weight (1..15 expected range)
function heatColor(weight: number, alpha: number) {
  const t = Math.min(1, Math.max(0, (weight - 1) / 14));
  // hsl(186,100%,70%) → hsl(292,84%,75%)
  const h = 186 + (292 - 186) * t;
  const s = 100 - 16 * t;
  const l = 70 + 5 * t;
  return `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
}
