import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWeaver } from "@/contexts/WeaverContext";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

export function WeaverLauncher() {
  const { open, openPanel } = useWeaver();
  if (open) return null;
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        track("weaver_open", { source: "launcher" });
        openPanel();
      }}
      className={cn(
        "fixed bottom-4 right-4 z-40 h-9 gap-1.5 rounded-full px-3.5",
        "bg-background/95 backdrop-blur border-border text-muted-foreground",
        "hover:text-foreground hover:border-primary/40 shadow-sm",
      )}
      aria-label="Ask Weaver"
    >
      <Sparkles className="size-3.5" />
      <span className="text-xs font-medium">Ask Weaver</span>
    </Button>
  );
}
