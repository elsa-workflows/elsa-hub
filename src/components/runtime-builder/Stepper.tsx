import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepperStep {
  id: number;
  label: string;
  short: string;
}

interface Props {
  steps: StepperStep[];
  active: number;
  furthestUnlocked: number;
  onSelect: (id: number) => void;
}

export function Stepper({ steps, active, furthestUnlocked, onSelect }: Props) {
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {steps.map((step, idx) => {
        const isActive = step.id === active;
        const isDone = step.id < active;
        const isUnlocked = step.id <= furthestUnlocked;
        return (
          <li key={step.id} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!isUnlocked}
              onClick={() => isUnlocked && onSelect(step.id)}
              className={cn(
                "group flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                isActive &&
                  "border-primary/60 bg-primary/15 text-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.4)]",
                !isActive &&
                  isDone &&
                  "border-primary/30 bg-primary/5 text-foreground hover:bg-primary/10",
                !isActive &&
                  !isDone &&
                  isUnlocked &&
                  "border-border/60 text-muted-foreground hover:text-foreground hover:border-border",
                !isUnlocked &&
                  "border-border/40 text-muted-foreground/50 cursor-not-allowed",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
                  isActive && "bg-primary text-primary-foreground",
                  !isActive && isDone && "bg-primary/20 text-primary",
                  !isActive && !isDone && "bg-muted text-muted-foreground",
                )}
              >
                {isDone ? <Check className="h-3 w-3" /> : step.id}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
              <span className="sm:hidden">{step.short}</span>
            </button>
            {idx < steps.length - 1 && (
              <span className="hidden h-px w-4 bg-border/60 sm:block" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
