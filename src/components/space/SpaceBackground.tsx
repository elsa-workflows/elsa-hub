import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Nebulae from "./Nebulae";
import StarField from "./StarField";
import ShootingStars from "./ShootingStars";
import CosmicEvents from "./CosmicEvents";
import CosmicEventsDebugPanel from "./CosmicEventsDebugPanel";

const isDev = import.meta.env.DEV;

export default function SpaceBackground() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [motionOverride, setMotionOverride] = useState(false);

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

  // Effective motion preference (can be overridden by debug panel)
  const shouldShowMotion = !prefersReducedMotion || motionOverride;

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
        
        {/* Dynamic effects - only if motion is allowed or overridden */}
        {shouldShowMotion && (
          <>
            <ShootingStars />
            <CosmicEvents />
          </>
        )}
      </div>
      {/* Debug panel only in development */}
      {isDev && (
        <CosmicEventsDebugPanel 
          reducedMotionEnabled={prefersReducedMotion}
          motionOverride={motionOverride}
          onToggleMotionOverride={() => setMotionOverride((prev) => !prev)}
        />
      )}
    </>
  );
}