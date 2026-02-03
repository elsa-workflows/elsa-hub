import { memo, useEffect, useState, useCallback, useRef } from "react";

interface ShootingStar {
  id: number;
  startX: number;
  startY: number;
  angle: number;
  duration: number;
  trailLength: number;
  opacity: number;
  variant: "distant" | "closer" | "very-distant" | "ultra-distant";
}

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

const ShootingStars = memo(function ShootingStars() {
  const [shootingStars, setShootingStars] = useState<ShootingStar[]>([]);
  const idCounterRef = useRef(0);
  const isVisibleRef = useRef(true);

  const spawnShootingStar = useCallback((variant: "distant" | "closer" | "very-distant" | "ultra-distant") => {
    if (!isVisibleRef.current) return;

    const isDistant = variant === "distant";
    const isVeryDistant = variant === "very-distant";
    const isUltraDistant = variant === "ultra-distant";
    
    const newStar: ShootingStar = {
      id: idCounterRef.current++,
      // Start from top-left area for natural top-to-bottom diagonal movement
      startX: randomBetween(0, 60),
      startY: randomBetween(0, 20),
      angle: isUltraDistant
        ? randomBetween(15, 25)
        : isVeryDistant 
          ? randomBetween(20, 35) 
          : isDistant 
            ? randomBetween(30, 50) 
            : randomBetween(40, 60),
      duration: isUltraDistant
        ? randomBetween(300, 420) // 5-7 minutes
        : isVeryDistant
          ? randomBetween(40, 60)
          : isDistant 
            ? randomBetween(3, 5) 
            : randomBetween(1, 2),
      trailLength: isUltraDistant
        ? randomBetween(250, 400)
        : isVeryDistant
          ? randomBetween(200, 350)
          : isDistant 
            ? randomBetween(150, 250) 
            : randomBetween(80, 150),
      opacity: isUltraDistant
        ? randomBetween(0.12, 0.2)
        : isVeryDistant
          ? randomBetween(0.2, 0.35)
          : isDistant 
            ? randomBetween(0.4, 0.6) 
            : randomBetween(0.6, 0.9),
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

    // Store timeout IDs so we can clear them on unmount
    let distantTimeoutId: ReturnType<typeof setTimeout>;
    let closerTimeoutId: ReturnType<typeof setTimeout>;
    let veryDistantTimeoutId: ReturnType<typeof setTimeout>;
    let ultraDistantTimeoutId: ReturnType<typeof setTimeout>;

    // Distant meteor spawner (every 15-30 seconds)
    const spawnDistant = () => {
      spawnShootingStar("distant");
      distantTimeoutId = setTimeout(spawnDistant, randomBetween(15000, 30000));
    };

    // Closer meteor spawner (every 30-60 seconds)
    const spawnCloser = () => {
      spawnShootingStar("closer");
      closerTimeoutId = setTimeout(spawnCloser, randomBetween(30000, 60000));
    };

    // Very distant meteor spawner (every 90-180 seconds)
    const spawnVeryDistant = () => {
      spawnShootingStar("very-distant");
      veryDistantTimeoutId = setTimeout(spawnVeryDistant, randomBetween(90000, 180000));
    };

    // Ultra distant meteor spawner (every 5-10 minutes)
    const spawnUltraDistant = () => {
      spawnShootingStar("ultra-distant");
      ultraDistantTimeoutId = setTimeout(spawnUltraDistant, randomBetween(300000, 600000));
    };

    // Initial delays before first spawn
    distantTimeoutId = setTimeout(spawnDistant, randomBetween(2000, 5000));
    closerTimeoutId = setTimeout(spawnCloser, randomBetween(5000, 15000));
    veryDistantTimeoutId = setTimeout(spawnVeryDistant, randomBetween(20000, 40000));
    ultraDistantTimeoutId = setTimeout(spawnUltraDistant, randomBetween(30000, 60000));

    // Expose spawn function for debug panel
    (window as any).spawnShootingStar = spawnShootingStar;

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      clearTimeout(distantTimeoutId);
      clearTimeout(closerTimeoutId);
      clearTimeout(veryDistantTimeoutId);
      clearTimeout(ultraDistantTimeoutId);
      delete (window as any).spawnShootingStar;
    };
  }, [spawnShootingStar]);

  const getHeadSize = (variant: ShootingStar["variant"]) => {
    switch (variant) {
      case "ultra-distant": return "0.5px";
      case "very-distant": return "1px";
      case "distant": return "2px";
      case "closer": return "3px";
    }
  };

  const getTrailHeight = (variant: ShootingStar["variant"]) => {
    switch (variant) {
      case "ultra-distant": return "0.25px";
      case "very-distant": return "0.5px";
      case "distant": return "1px";
      case "closer": return "2px";
    }
  };

  const getGlowSize = (variant: ShootingStar["variant"], opacity: number) => {
    switch (variant) {
      case "ultra-distant": return `0 0 2px rgba(255, 255, 255, ${opacity})`;
      case "very-distant": return `0 0 4px rgba(255, 255, 255, ${opacity})`;
      case "distant": return `0 0 6px rgba(255, 255, 255, ${opacity})`;
      case "closer": return `0 0 10px rgba(255, 255, 255, ${opacity})`;
    }
  };

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
              width: getHeadSize(star.variant),
              height: getHeadSize(star.variant),
              opacity: star.opacity,
              boxShadow: getGlowSize(star.variant, star.opacity),
            }}
          />
          {/* Meteor trail - positioned behind the meteor (left side since moving right) */}
          <div
            className="absolute top-0 right-full"
            style={{
              width: `${star.trailLength}px`,
              height: getTrailHeight(star.variant),
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
