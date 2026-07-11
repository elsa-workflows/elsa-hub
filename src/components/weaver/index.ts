// Barrel intentionally excludes WeaverPanel to keep it out of the initial bundle.
// Consumers should render <WeaverHost /> which lazy-loads the panel on demand.
export { WeaverProvider, useWeaver } from "@/contexts/WeaverContext";
export { WeaverLauncher } from "./WeaverLauncher";
export { WeaverHost } from "./WeaverHost";
