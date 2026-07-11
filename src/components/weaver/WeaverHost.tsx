import { lazy, Suspense } from "react";
import { useWeaver } from "@/contexts/WeaverContext";

// Panel is heavy (AI chat UI, streaming client, markdown renderer).
// It stays out of the initial graph until the user activates Weaver.
const WeaverPanel = lazy(() =>
  import("./WeaverPanel").then((m) => ({ default: m.WeaverPanel })),
);

export function WeaverHost() {
  const { open } = useWeaver();
  if (!open) return null;
  return (
    <Suspense fallback={null}>
      <WeaverPanel />
    </Suspense>
  );
}
