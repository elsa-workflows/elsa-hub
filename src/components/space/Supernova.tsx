import { memo, useEffect, useState, useRef, useCallback } from "react";

interface SupernovaInstance {
  id: number;
  x: number;
  y: number;
  maxSize: number;
}

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

const Supernova = memo(function Supernova() {
  const [supernovas, setSupernovas] = useState<SupernovaInstance[]>([]);
  const idCounterRef = useRef(0);
  const isVisibleRef = useRef(true);

  const spawnSupernova = useCallback(() => {
    if (!isVisibleRef.current) return;

    const newSupernova: SupernovaInstance = {
      id: idCounterRef.current++,
      x: randomBetween(10, 90),
      y: randomBetween(10, 90),
      maxSize: randomBetween(150, 300),
    };

    setSupernovas((prev) => [...prev, newSupernova]);

    // Remove after animation (3 seconds)
    setTimeout(() => {
      setSupernovas((prev) => prev.filter((s) => s.id !== newSupernova.id));
    }, 3000);
  }, []);

  useEffect(() => {
    // Visibility API
    const handleVisibility = () => {
      isVisibleRef.current = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    // Supernova spawner (every 60-180 seconds)
    const scheduleNext = () => {
      const delay = randomBetween(60000, 180000);
      return setTimeout(() => {
        spawnSupernova();
        scheduleNext();
      }, delay);
    };

    // Initial spawn after 30-60 seconds
    const initialTimeout = setTimeout(() => {
      spawnSupernova();
      scheduleNext();
    }, randomBetween(30000, 60000));

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      clearTimeout(initialTimeout);
    };
  }, [spawnSupernova]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {supernovas.map((nova) => (
        <div
          key={nova.id}
          className="absolute animate-supernova-burst"
          style={{
            left: `${nova.x}%`,
            top: `${nova.y}%`,
            width: `${nova.maxSize}px`,
            height: `${nova.maxSize}px`,
            transform: "translate(-50%, -50%)",
          }}
        >
          {/* White core */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.4) 20%, transparent 50%)",
            }}
          />
          {/* Rose glow */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle, hsl(340 90% 70% / 0.6) 0%, hsl(340 90% 60% / 0.2) 40%, transparent 70%)",
            }}
          />
        </div>
      ))}
    </div>
  );
});

export default Supernova;
