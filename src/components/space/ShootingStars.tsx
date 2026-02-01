import { memo, useEffect, useState, useCallback, useRef } from "react";

interface ShootingStar {
  id: number;
  startX: number;
  startY: number;
  angle: number;
  duration: number;
  trailLength: number;
  opacity: number;
  variant: "distant" | "closer";
}

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

const ShootingStars = memo(function ShootingStars() {
  const [shootingStars, setShootingStars] = useState<ShootingStar[]>([]);
  const idCounterRef = useRef(0);
  const isVisibleRef = useRef(true);

  const spawnShootingStar = useCallback((variant: "distant" | "closer") => {
    if (!isVisibleRef.current) return;

    const isDistant = variant === "distant";
    
    const newStar: ShootingStar = {
      id: idCounterRef.current++,
      // Start from top-left area for natural top-to-bottom diagonal movement
      startX: randomBetween(0, 60),
      startY: randomBetween(0, 20),
      angle: isDistant ? randomBetween(30, 50) : randomBetween(40, 60),
      duration: isDistant ? randomBetween(3, 5) : randomBetween(1, 2),
      trailLength: isDistant ? randomBetween(150, 250) : randomBetween(80, 150),
      opacity: isDistant ? randomBetween(0.4, 0.6) : randomBetween(0.6, 0.9),
      variant,
    };

    setShootingStars((prev) => [...prev, newStar]);

    // Remove after animation completes
    setTimeout(() => {
      setShootingStars((prev) => prev.filter((s) => s.id !== newStar.id));
    }, newStar.duration * 1000 + 500);
  }, []);

  useEffect(() => {
    // Visibility API to pause when tab is hidden
    const handleVisibility = () => {
      isVisibleRef.current = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    // Distant meteor spawner (every 15-30 seconds)
    const spawnDistant = () => {
      spawnShootingStar("distant");
      const nextDelay = randomBetween(15000, 30000);
      setTimeout(spawnDistant, nextDelay);
    };

    // Closer meteor spawner (every 30-60 seconds)
    const spawnCloser = () => {
      spawnShootingStar("closer");
      const nextDelay = randomBetween(30000, 60000);
      setTimeout(spawnCloser, nextDelay);
    };

    // Initial delays before first spawn
    const distantTimeout = setTimeout(spawnDistant, randomBetween(5000, 15000));
    const closerTimeout = setTimeout(spawnCloser, randomBetween(10000, 30000));

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      clearTimeout(distantTimeout);
      clearTimeout(closerTimeout);
    };
  }, [spawnShootingStar]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {shootingStars.map((star) => (
        <div
          key={star.id}
          className="absolute"
          style={{
            left: `${star.startX}%`,
            top: `${star.startY}%`,
            ["--angle" as string]: `${star.angle}deg`,
            animation: `meteor-fly ${star.duration}s linear forwards`,
          }}
        >
          {/* Meteor head */}
          <div
            className="absolute rounded-full bg-white"
            style={{
              width: star.variant === "distant" ? "2px" : "3px",
              height: star.variant === "distant" ? "2px" : "3px",
              opacity: star.opacity,
              boxShadow: `0 0 ${star.variant === "distant" ? 6 : 10}px rgba(255, 255, 255, ${star.opacity})`,
            }}
          />
          {/* Meteor trail - positioned behind the meteor (left side since moving right) */}
          <div
            className="absolute top-0 right-full"
            style={{
              width: `${star.trailLength}px`,
              height: star.variant === "distant" ? "1px" : "2px",
              background: `linear-gradient(to right, transparent, rgba(255, 255, 255, ${star.opacity}))`,
              transform: "translateY(-50%)",
            }}
          />
        </div>
      ))}
    </div>
  );
});

export default ShootingStars;
