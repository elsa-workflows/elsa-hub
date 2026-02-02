import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Nebulae from "./Nebulae";
import StarField from "./StarField";
import ShootingStars from "./ShootingStars";
import CosmicEvents from "./CosmicEvents";
import CosmicEventsDebugPanel from "./CosmicEventsDebugPanel";

export default function SpaceBackground() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check for reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Don't render anything in light mode or before mount
  if (!mounted || resolvedTheme !== "dark") {
    return null;
  }

  return (
    <>
      <div 
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 0 }}
        aria-hidden="true"
      >
        {/* Nebulae layer - always visible in dark mode */}
        <Nebulae />
        
        {/* Star field - always visible in dark mode */}
        <StarField />
        
        {/* Dynamic effects - only if motion is allowed */}
        {!prefersReducedMotion && (
          <>
            <ShootingStars />
            <CosmicEvents />
          </>
        )}
      </div>
      {/* Debug panel always visible for testing - shows warning if reduced motion is enabled */}
      <CosmicEventsDebugPanel reducedMotionEnabled={prefersReducedMotion} />
    </>
  );
}
