import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Sparkles, Bug } from "lucide-react";

const eventTypes = [
  { type: "supernova-classic", label: "Supernova (Classic)", emoji: "💥" },
  { type: "supernova-blue", label: "Supernova (Blue)", emoji: "💙" },
  { type: "supernova-red", label: "Supernova (Red)", emoji: "❤️" },
  { type: "supernova-neutron", label: "Neutron Star", emoji: "⚪" },
  { type: "pulsar", label: "Pulsar", emoji: "📡" },
  { type: "nebula-flash", label: "Nebula Flash", emoji: "🌫️" },
  { type: "binary-flare", label: "Binary Flare", emoji: "✨" },
  { type: "black-hole", label: "Black Hole", emoji: "🕳️" },
] as const;

export default function CosmicEventsDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Toggle panel with Ctrl+Shift+D
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, []);

  // Animate visibility
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const spawnEvent = (type: string) => {
    if (window.spawnCosmicEvent) {
      window.spawnCosmicEvent(type as Parameters<typeof window.spawnCosmicEvent>[0]);
      console.log(`🌌 Spawned: ${type}`);
    }
  };

  const spawnAll = () => {
    eventTypes.forEach((event, index) => {
      setTimeout(() => spawnEvent(event.type), index * 500);
    });
  };

  if (!isVisible) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        size="icon"
        variant="outline"
        className="fixed bottom-4 right-4 z-50 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border-primary/20 hover:border-primary/50 shadow-lg pointer-events-auto"
        title="Open Cosmic Events Debug Panel (Ctrl+Shift+D)"
      >
        <Bug className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 w-72 rounded-xl border border-primary/20 bg-background/95 backdrop-blur-md shadow-2xl transition-all duration-200 pointer-events-auto ${
        isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Cosmic Events</span>
        </div>
        <Button
          onClick={() => setIsOpen(false)}
          size="icon"
          variant="ghost"
          className="h-6 w-6"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Event buttons */}
      <div className="p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {eventTypes.map((event) => (
            <Button
              key={event.type}
              onClick={() => spawnEvent(event.type)}
              variant="outline"
              size="sm"
              className="h-auto py-2 px-3 justify-start text-left text-xs border-border/50 hover:border-primary/50 hover:bg-primary/5"
            >
              <span className="mr-1.5">{event.emoji}</span>
              <span className="truncate">{event.label}</span>
            </Button>
          ))}
        </div>

        {/* Spawn all button */}
        <Button
          onClick={spawnAll}
          variant="default"
          size="sm"
          className="w-full mt-2"
        >
          <Sparkles className="h-3 w-3 mr-2" />
          Spawn All (Staggered)
        </Button>

        {/* Random spawn */}
        <Button
          onClick={() => spawnEvent(eventTypes[Math.floor(Math.random() * eventTypes.length)].type)}
          variant="secondary"
          size="sm"
          className="w-full"
        >
          🎲 Random Event
        </Button>
      </div>

      {/* Footer hint */}
      <div className="border-t border-border/50 px-4 py-2">
        <p className="text-[10px] text-muted-foreground text-center">
          Press <kbd className="px-1 py-0.5 rounded bg-muted text-[9px]">Ctrl+Shift+D</kbd> to toggle
        </p>
      </div>
    </div>
  );
}
