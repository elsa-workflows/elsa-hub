import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface TypingDotsProps {
  className?: string;
  "aria-label"?: string;
}

/**
 * Classic chat-style typing indicator: three dots gently bouncing in a pill.
 * Used while the Weaver assistant is generating a response.
 */
export function TypingDots({ className, ...rest }: TypingDotsProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={rest["aria-label"] ?? "Typing"}
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full bg-muted px-2.5 py-1.5",
        className,
      )}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          aria-hidden
          className="block size-1.5 rounded-full bg-primary/80"
          animate={{ y: [0, -3, 0], opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}
