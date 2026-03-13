import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "@/hooks/useScrollReveal";

type AnimationVariant = "fade-up" | "fade-in" | "scale-in";

interface ScrollRevealProps {
  children: ReactNode;
  variant?: AnimationVariant;
  delay?: number;
  duration?: number;
  className?: string;
}

const variantClasses: Record<AnimationVariant, { hidden: string; visible: string }> = {
  "fade-up": {
    hidden: "opacity-0 translate-y-6",
    visible: "opacity-100 translate-y-0",
  },
  "fade-in": {
    hidden: "opacity-0",
    visible: "opacity-100",
  },
  "scale-in": {
    hidden: "opacity-0 scale-95",
    visible: "opacity-100 scale-100",
  },
};

export function ScrollReveal({
  children,
  variant = "fade-up",
  delay = 0,
  duration = 600,
  className,
}: ScrollRevealProps) {
  const { ref, isVisible } = useScrollReveal();
  const classes = variantClasses[variant];

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all ease-out",
        isVisible ? classes.visible : classes.hidden,
        className
      )}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
