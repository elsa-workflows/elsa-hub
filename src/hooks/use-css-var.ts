import { useEffect, useState } from "react";

/**
 * Reads a CSS custom property from :root and returns its current value,
 * re-reading whenever the html element's class or data-* attributes change
 * (e.g. dark mode toggled, accent palette switched).
 */
export function useCssVar(name: string): string {
  const [value, setValue] = useState<string>(() => readVar(name));

  useEffect(() => {
    const update = () => setValue(readVar(name));
    update();
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-accent", "data-dark-flavor"],
    });
    return () => mo.disconnect();
  }, [name]);

  return value;
}

function readVar(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
