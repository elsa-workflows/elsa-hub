// Animated activity indicator shown while Weaver is thinking or streaming.
// Renders a weaving orb (three orbiting dots) plus a rotating status phrase.

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { cn } from "@/lib/utils";

interface WeaverThinkingProps {
  variant?: "thinking" | "streaming";
  /** Optional override phrase. When set, phrase rotation is disabled. */
  label?: string;
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

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-center gap-3 px-1 py-1 text-sm", className)}
    >
      <WeavingOrb pulse={variant === "streaming"} />
      <Shimmer
        as="span"
        duration={variant === "streaming" ? 1.6 : 2.2}
        className="text-muted-foreground"
      >
        {`${text}…`}
      </Shimmer>
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
