import { memo, useMemo, useEffect, useState } from "react";

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleDelay: number;
  layer: number;
}

const generateStars = (count: number, layer: number, sizeRange: [number, number]): Star[] => {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      id: layer * 1000 + i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
      opacity: 0.3 + Math.random() * 0.5,
      twinkleDelay: Math.random() * 8,
      layer,
    });
  }
  return stars;
};

const StarField = memo(function StarField() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    // Use passive listener for better scroll performance
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const stars = useMemo(() => {
    return [
      ...generateStars(80, 1, [0.5, 1]), // Tiny stars - many
      ...generateStars(40, 2, [1, 1.5]), // Small stars - fewer
      ...generateStars(15, 3, [1.5, 2.5]), // Medium stars - sparse
    ];
  }, []);

  // Parallax multipliers - closer layers move more
  const parallaxLayer1 = scrollY * 0.08; // Fastest (closest)
  const parallaxLayer2 = scrollY * 0.04; // Medium
  const parallaxLayer3 = scrollY * 0.02; // Slowest (furthest)

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Layer 1: Fastest drift (closest feeling) */}
      <div 
        className="absolute inset-0 animate-star-drift-1"
        style={{
          transform: `translateY(${parallaxLayer1}px)`,
          willChange: "transform",
        }}
      >
        {stars
          .filter((s) => s.layer === 1)
          .map((star) => (
            <div
              key={star.id}
              className="absolute rounded-full bg-white animate-twinkle"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                opacity: star.opacity,
                animationDelay: `${star.twinkleDelay}s`,
              }}
            />
          ))}
      </div>

      {/* Layer 2: Medium drift */}
      <div 
        className="absolute inset-0 animate-star-drift-2"
        style={{
          transform: `translateY(${parallaxLayer2}px)`,
          willChange: "transform",
        }}
      >
        {stars
          .filter((s) => s.layer === 2)
          .map((star) => (
            <div
              key={star.id}
              className="absolute rounded-full bg-white animate-twinkle"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                opacity: star.opacity,
                animationDelay: `${star.twinkleDelay}s`,
              }}
            />
          ))}
      </div>

      {/* Layer 3: Slowest drift (furthest away) */}
      <div 
        className="absolute inset-0 animate-star-drift-3"
        style={{
          transform: `translateY(${parallaxLayer3}px)`,
          willChange: "transform",
        }}
      >
        {stars
          .filter((s) => s.layer === 3)
          .map((star) => (
            <div
              key={star.id}
              className="absolute rounded-full bg-white animate-twinkle"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                opacity: star.opacity,
                animationDelay: `${star.twinkleDelay}s`,
                boxShadow: star.size > 2 ? `0 0 ${star.size * 2}px rgba(255,255,255,0.3)` : undefined,
              }}
            />
          ))}
      </div>
    </div>
  );
});

export default StarField;
