import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCopilot } from "@/contexts/CopilotContext";
import { cn } from "@/lib/utils";

export function CopilotLauncher() {
  const { open, openPanel } = useCopilot();
  if (open) return null;
  return (
    <Button
      onClick={() => openPanel()}
      className={cn(
        "fixed bottom-5 right-5 z-50 h-12 gap-2 rounded-full px-5 shadow-lg",
        "bg-primary text-primary-foreground hover:bg-primary/90",
      )}
      aria-label="Open Elsa Copilot"
    >
      <Sparkles className="size-4" />
      <span className="text-sm font-medium">Copilot</span>
    </Button>
  );
}
