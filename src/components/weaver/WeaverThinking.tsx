// Animated activity indicator shown while Weaver is thinking or streaming.
// Renders a weaving orb (three orbiting dots), a rotating status phrase,
// and an asymptotic progress bar driven by streaming signals.

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { cn } from "@/lib/utils";

interface WeaverThinkingProps {
  variant?: "thinking" | "streaming";
  /** Optional override phrase. When set, phrase rotation is disabled. */
  label?: string;
  /**
   * Heuristic completion estimate in [0, 1]. Bar is hidden when undefined.
   * Callers typically derive this from elapsed time, tool-call progress,
   * and streamed text length — see `estimateWeaverProgress`.
   */
  progress?: number;
  className?: string;
}

const THINKING_PHRASES = [
  "Thinking",
  "Weaving context",
  "Consulting the loom",
  "Threading ideas",
  "Gathering sources",
];

const STREAMING_PHRASES = ["Weaving response", "Streaming"];

export function WeaverThinking({
  variant = "thinking",
  label,
  progress,
  className,
}: WeaverThinkingProps) {
  const phrases = variant === "streaming" ? STREAMING_PHRASES : THINKING_PHRASES;
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (label) return;
    const id = window.setInterval(() => {
      setIdx((i) => (i + 1) % phrases.length);
    }, 1800);
    return () => window.clearInterval(id);
  }, [label, phrases.length]);

  const text = label ?? phrases[idx];
  const pct =
    typeof progress === "number"
      ? Math.max(2, Math.min(98, Math.round(progress * 100)))
      : null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct ?? undefined}
      className={cn("flex flex-col gap-1.5 px-1 py-1 text-sm", className)}
    >
      <div className="flex items-center gap-3">
        <WeavingOrb pulse={variant === "streaming"} />
        <Shimmer
          as="span"
          duration={variant === "streaming" ? 1.6 : 2.2}
          className="text-muted-foreground"
        >
          {`${text}…`}
        </Shimmer>
        {pct !== null && (
          <span className="ml-auto tabular-nums text-xs text-muted-foreground/70">
            {pct}%
          </span>
        )}
      </div>
      {pct !== null && <WeaverProgressBar value={pct} />}
    </div>
  );
}

function WeaverProgressBar({ value }: { value: number }) {
  // Thin track with a primary-colored fill that animates to its width,
  // plus a moving sheen so progress feels alive even when value is steady.
  return (
    <div className="relative h-1 w-full overflow-hidden rounded-full bg-muted">
      <motion.div
        className="relative h-full rounded-full bg-primary/80"
        initial={false}
        animate={{ width: `${value}%` }}
        transition={{ type: "spring", stiffness: 80, damping: 20, mass: 0.6 }}
      >
        <motion.span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-primary-foreground/40 to-transparent"
          animate={{ x: ["-100%", "300%"] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </div>
  );
}

function WeavingOrb({ pulse }: { pulse?: boolean }) {
  // Three dots orbiting around a center, with a soft halo behind.
  return (
    <div className="relative flex size-6 items-center justify-center">
      <motion.span
        aria-hidden
        className="absolute inset-0 rounded-full bg-primary/25 blur-md"
        animate={{ opacity: pulse ? [0.4, 0.8, 0.4] : [0.3, 0.6, 0.3] }}
        transition={{
          duration: pulse ? 1.2 : 1.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        aria-hidden
        className="relative size-6"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
      >
        {[0, 1, 2].map((i) => {
          const angle = (i / 3) * Math.PI * 2;
          const radius = 8;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          return (
            <motion.span
              key={i}
              className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
              style={{ x, y }}
              animate={{ scale: [0.7, 1.1, 0.7], opacity: [0.6, 1, 0.6] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.18,
              }}
            />
          );
        })}
      </motion.div>
    </div>
  );
}

/**
 * Heuristic progress estimate for a Weaver turn.
 *
 * We don't know the true completion fraction, so we combine three signals
 * through an asymptotic curve `1 - exp(-k * x)` that approaches 1 but never
 * reaches it — the bar only snaps to 100% when the turn finishes.
 *
 * Signals:
 *  - elapsed time (a turn typically resolves within ~20s)
 *  - completed tool calls (each one is meaningful work)
 *  - streamed text length (the final phase)
 *
 * The result is monotonic per call but the caller is responsible for not
 * letting the displayed value go backwards across renders.
 */
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
