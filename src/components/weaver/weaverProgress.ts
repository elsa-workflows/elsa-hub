// Heuristic progress estimate for a Weaver turn.
//
// We don't know the true completion fraction, so we combine three signals
// through an asymptotic curve `1 - exp(-k * x)` that approaches 1 but never
// reaches it — the bar only snaps to 100% when the turn finishes.
//
// Signals:
//  - elapsed time (a turn typically resolves within ~20s)
//  - completed tool calls (each one is meaningful work)
//  - streamed text length (the final phase)
//
// The result is monotonic per call but the caller is responsible for not
// letting the displayed value go backwards across renders.
export function estimateWeaverProgress({
  elapsedMs,
  toolPartsTotal,
  toolPartsDone,
  textLength,
  streaming,
}: {
  elapsedMs: number;
  toolPartsTotal: number;
  toolPartsDone: number;
  textLength: number;
  streaming: boolean;
}): number {
  // Time component: ~50% at 10s, ~75% at 20s.
  const timeSignal = 1 - Math.exp(-elapsedMs / 14000);

  // Tool component: each completed tool call adds confidence.
  const toolWeight = toolPartsTotal > 0 ? toolPartsDone / toolPartsTotal : 0;
  const toolSignal = 1 - Math.exp(-toolWeight * 2.2);

  // Text component: ~50% at 400 chars, ~80% at 1000 chars.
  const textSignal = 1 - Math.exp(-textLength / 600);

  // Blend: while no text has streamed, lean on time + tools; once text
  // is flowing, it dominates because we're clearly in the final phase.
  const preText = 0.45 * timeSignal + 0.55 * toolSignal;
  const blended = streaming && textLength > 0
    ? 0.25 * preText + 0.75 * textSignal
    : preText;

  // Cap so the bar never claims 100% until the caller swaps it out.
  return Math.min(0.95, blended);
}
