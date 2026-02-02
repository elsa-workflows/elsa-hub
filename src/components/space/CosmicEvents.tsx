import { memo, useEffect, useState, useRef, useCallback } from "react";

type CosmicEventType =
  | "supernova-classic"
  | "supernova-blue"
  | "supernova-red"
  | "supernova-neutron"
  | "pulsar"
  | "nebula-flash"
  | "binary-flare"
  | "black-hole";

// Debug mode types
type DebugSpawnFunction = (type?: CosmicEventType) => void;
declare global {
  interface Window {
    spawnCosmicEvent?: DebugSpawnFunction;
    cosmicEventTypes?: CosmicEventType[];
  }
}

interface CosmicEvent {
  id: number;
  type: CosmicEventType;
  x: number;
  y: number;
  size: number;
  duration: number;
}

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

// Weighted random selection
const eventWeights: { type: CosmicEventType; weight: number }[] = [
  { type: "supernova-classic", weight: 23 },
  { type: "supernova-blue", weight: 14 },
  { type: "supernova-red", weight: 14 },
  { type: "supernova-neutron", weight: 10 },
  { type: "pulsar", weight: 14 },
  { type: "nebula-flash", weight: 11 },
  { type: "binary-flare", weight: 8 },
  { type: "black-hole", weight: 6 },
];

const totalWeight = eventWeights.reduce((sum, e) => sum + e.weight, 0);

function selectRandomEvent(): CosmicEventType {
  let random = Math.random() * totalWeight;
  for (const { type, weight } of eventWeights) {
    random -= weight;
    if (random <= 0) return type;
  }
  return "supernova-classic";
}

function getEventConfig(type: CosmicEventType) {
  switch (type) {
    case "supernova-classic":
      return { size: randomBetween(150, 300), duration: 3000 };
    case "supernova-blue":
      return { size: randomBetween(180, 350), duration: 3500 };
    case "supernova-red":
      return { size: randomBetween(200, 400), duration: 4000 };
    case "supernova-neutron":
      return { size: randomBetween(120, 250), duration: 3000 };
    case "pulsar":
      return { size: randomBetween(300, 500), duration: 5000 };
    case "nebula-flash":
      return { size: randomBetween(500, 800), duration: 8000 };
    case "binary-flare":
      return { size: randomBetween(60, 100), duration: 3000 };
    case "black-hole":
      return { size: randomBetween(200, 350), duration: 5000 };
    default:
      return { size: 200, duration: 3000 };
  }
}

// Supernova renderer with color variants
function SupernovaEvent({ event }: { event: CosmicEvent }) {
  const colors = {
    "supernova-classic": {
      core: "rgba(255, 255, 255, 0.9)",
      coreFade: "rgba(255, 255, 255, 0.4)",
      glow: "hsl(340 90% 70% / 0.6)",
      glowFade: "hsl(340 90% 60% / 0.2)",
    },
    "supernova-blue": {
      core: "rgba(255, 255, 255, 0.95)",
      coreFade: "rgba(200, 240, 255, 0.5)",
      glow: "hsl(195 90% 60% / 0.7)",
      glowFade: "hsl(220 80% 40% / 0.3)",
    },
    "supernova-red": {
      core: "rgba(255, 250, 200, 0.9)",
      coreFade: "rgba(255, 200, 100, 0.5)",
      glow: "hsl(30 90% 55% / 0.7)",
      glowFade: "hsl(0 80% 40% / 0.3)",
    },
  };

  const palette = colors[event.type as keyof typeof colors] || colors["supernova-classic"];

  return (
    <div
      className="absolute animate-supernova-burst"
      style={{
        left: `${event.x}%`,
        top: `${event.y}%`,
        width: `${event.size}px`,
        height: `${event.size}px`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${palette.core} 0%, ${palette.coreFade} 20%, transparent 50%)`,
        }}
      />
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${palette.glow} 0%, ${palette.glowFade} 40%, transparent 70%)`,
        }}
      />
    </div>
  );
}

// Neutron star with expanding ripples
function NeutronStarEvent({ event }: { event: CosmicEvent }) {
  return (
    <div
      className="absolute"
      style={{
        left: `${event.x}%`,
        top: `${event.y}%`,
        width: `${event.size}px`,
        height: `${event.size}px`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* Core pulse */}
      <div
        className="absolute inset-0 rounded-full animate-supernova-burst"
        style={{
          background: `radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, hsl(180 80% 60% / 0.6) 30%, transparent 60%)`,
        }}
      />
      {/* Ripple rings */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute inset-0 rounded-full animate-neutron-ripple"
          style={{
            border: "2px solid hsl(180 70% 50% / 0.4)",
            animationDelay: `${i * 400}ms`,
          }}
        />
      ))}
    </div>
  );
}

// Pulsar with rotating beam
function PulsarEvent({ event }: { event: CosmicEvent }) {
  return (
    <div
      className="absolute animate-pulsar-sweep"
      style={{
        left: `${event.x}%`,
        top: `${event.y}%`,
        width: `${event.size}px`,
        height: `${event.size}px`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* Central point */}
      <div
        className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2"
        style={{
          background: "rgba(255, 255, 255, 0.9)",
          boxShadow: "0 0 10px 3px hsl(200 90% 70% / 0.8)",
        }}
      />
      {/* Light beam */}
      <div
        className="absolute left-1/2 top-1/2 origin-left"
        style={{
          width: `${event.size / 2}px`,
          height: "2px",
          background: "linear-gradient(to right, hsl(200 90% 80% / 0.8), transparent)",
          transform: "translateY(-50%)",
        }}
      />
      {/* Opposite beam */}
      <div
        className="absolute left-1/2 top-1/2 origin-left rotate-180"
        style={{
          width: `${event.size / 2}px`,
          height: "2px",
          background: "linear-gradient(to right, hsl(200 90% 80% / 0.8), transparent)",
          transform: "translateY(-50%) rotate(180deg)",
        }}
      />
    </div>
  );
}

// Nebula flash - large diffuse glow
function NebulaFlashEvent({ event }: { event: CosmicEvent }) {
  return (
    <div
      className="absolute animate-nebula-flash"
      style={{
        left: `${event.x}%`,
        top: `${event.y}%`,
        width: `${event.size}px`,
        height: `${event.size}px`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div
        className="absolute inset-0 rounded-full blur-[80px]"
        style={{
          background: `radial-gradient(circle, hsl(280 70% 60% / 0.4) 0%, hsl(320 80% 50% / 0.2) 50%, transparent 70%)`,
        }}
      />
    </div>
  );
}

// Binary star flare - two synchronized points
function BinaryFlareEvent({ event }: { event: CosmicEvent }) {
  const separation = event.size * 0.4;
  
  return (
    <div
      className="absolute"
      style={{
        left: `${event.x}%`,
        top: `${event.y}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* Star 1 */}
      <div
        className="absolute animate-binary-pulse"
        style={{
          left: `-${separation / 2}px`,
          width: `${event.size * 0.5}px`,
          height: `${event.size * 0.5}px`,
        }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, hsl(45 90% 60% / 0.6) 40%, transparent 70%)`,
          }}
        />
      </div>
      {/* Star 2 */}
      <div
        className="absolute animate-binary-pulse"
        style={{
          left: `${separation / 2}px`,
          width: `${event.size * 0.4}px`,
          height: `${event.size * 0.4}px`,
          animationDelay: "100ms",
        }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(255, 255, 255, 0.85) 0%, hsl(40 85% 55% / 0.5) 40%, transparent 70%)`,
          }}
        />
      </div>
    </div>
  );
}

// Black hole with gravitational lensing effect
function BlackHoleEvent({ event }: { event: CosmicEvent }) {
  const lensingRings = [0, 1, 2, 3, 4];
  
  return (
    <div
      className="absolute animate-black-hole-appear"
      style={{
        left: `${event.x}%`,
        top: `${event.y}%`,
        width: `${event.size}px`,
        height: `${event.size}px`,
        animationDuration: `${event.duration}ms`,
      }}
    >
      {/* Lensing rings - expanding outward */}
      {lensingRings.map((i) => (
        <div
          key={i}
          className="absolute inset-0 rounded-full animate-black-hole-lensing"
          style={{
            border: "2px solid hsl(30 70% 50% / 0.3)",
            animationDelay: `${i * 300}ms`,
            animationDuration: `${event.duration * 0.6}ms`,
          }}
        />
      ))}
      
      {/* Accretion disk - spinning ring */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full animate-black-hole-spin"
        style={{
          width: `${event.size * 0.5}px`,
          height: `${event.size * 0.5}px`,
          border: "3px solid transparent",
          borderTopColor: "hsl(40 90% 55% / 0.8)",
          borderRightColor: "hsl(30 90% 50% / 0.5)",
          animationDuration: `${event.duration}ms`,
        }}
      />
      
      {/* Event horizon glow */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: `${event.size * 0.2}px`,
          height: `${event.size * 0.2}px`,
          boxShadow: `
            0 0 ${event.size * 0.15}px hsl(30 90% 50% / 0.6),
            0 0 ${event.size * 0.25}px hsl(280 60% 40% / 0.4)
          `,
        }}
      />
      
      {/* Dark core */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: `${event.size * 0.15}px`,
          height: `${event.size * 0.15}px`,
          background: `radial-gradient(circle, hsl(280 40% 5%) 0%, hsl(280 30% 3%) 60%, transparent 100%)`,
        }}
      />
    </div>
  );
}

// Main component
const CosmicEvents = memo(function CosmicEvents() {
  const [events, setEvents] = useState<CosmicEvent[]>([]);
  const idCounterRef = useRef(0);
  const isVisibleRef = useRef(true);

  const spawnEvent = useCallback((specificType?: CosmicEventType) => {
    const type = specificType || selectRandomEvent();
    const config = getEventConfig(type);

    const newEvent: CosmicEvent = {
      id: idCounterRef.current++,
      type,
      x: randomBetween(10, 90),
      y: randomBetween(10, 90),
      size: config.size,
      duration: config.duration,
    };

    setEvents((prev) => [...prev, newEvent]);

    // Remove after animation completes
    setTimeout(() => {
      setEvents((prev) => prev.filter((e) => e.id !== newEvent.id));
    }, config.duration);
  }, []);

  // Debug mode: expose spawn function to window and add keyboard shortcut
  useEffect(() => {
    // Expose to console
    window.spawnCosmicEvent = spawnEvent;
    window.cosmicEventTypes = [
      "supernova-classic",
      "supernova-blue", 
      "supernova-red",
      "supernova-neutron",
      "pulsar",
      "nebula-flash",
      "binary-flare",
      "black-hole",
    ];

    // Keyboard shortcut: Ctrl+Shift+C spawns random event
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "C") {
        e.preventDefault();
        spawnEvent();
        console.log("🌌 Spawned random cosmic event");
      }
    };
    document.addEventListener("keydown", handleKeydown);

    console.log(
      "🌌 Cosmic Events Debug Mode:\n" +
      "  • Press Ctrl+Shift+C to spawn a random event\n" +
      "  • window.spawnCosmicEvent() - spawn random event\n" +
      "  • window.spawnCosmicEvent('black-hole') - spawn specific type\n" +
      "  • window.cosmicEventTypes - list all event types"
    );

    return () => {
      delete window.spawnCosmicEvent;
      delete window.cosmicEventTypes;
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [spawnEvent]);

  useEffect(() => {
    const handleVisibility = () => {
      isVisibleRef.current = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    // Store timeout ID so we can clear it on unmount
    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      const delay = randomBetween(60000, 180000); // 60-180 seconds between events
      timeoutId = setTimeout(() => {
        spawnEvent();
        scheduleNext();
      }, delay);
    };

    // Initial spawn after 10-20 seconds (reduced from 30-60)
    timeoutId = setTimeout(() => {
      spawnEvent();
      scheduleNext();
    }, randomBetween(10000, 20000));

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      clearTimeout(timeoutId);
    };
  }, [spawnEvent]);

  const renderEvent = (event: CosmicEvent) => {
    switch (event.type) {
      case "supernova-classic":
      case "supernova-blue":
      case "supernova-red":
        return <SupernovaEvent key={event.id} event={event} />;
      case "supernova-neutron":
        return <NeutronStarEvent key={event.id} event={event} />;
      case "pulsar":
        return <PulsarEvent key={event.id} event={event} />;
      case "nebula-flash":
        return <NebulaFlashEvent key={event.id} event={event} />;
      case "binary-flare":
        return <BinaryFlareEvent key={event.id} event={event} />;
      case "black-hole":
        return <BlackHoleEvent key={event.id} event={event} />;
      default:
        return null;
    }
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {events.map(renderEvent)}
    </div>
  );
});

export default CosmicEvents;
