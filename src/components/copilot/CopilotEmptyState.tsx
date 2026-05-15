import { useLocation } from "react-router-dom";
import { Sparkles, MessageCircleQuestion, Wrench, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onPick: (text: string) => void;
}

export function CopilotEmptyState({ onPick }: Props) {
  const { pathname } = useLocation();
  const inRb = pathname.startsWith("/elsa-plus/runtime-builder");
  const inDashboard = pathname.startsWith("/dashboard");

  const suggestions: { icon: React.ComponentType<{ className?: string }>; text: string }[] = inRb
    ? [
        { icon: Wrench, text: "Add the Identity package and turn on OpenIddict." },
        { icon: Sparkles, text: "Auto-fill any missing infrastructure for me." },
        { icon: MessageCircleQuestion, text: "Validate my current build and explain any issues." },
      ]
    : inDashboard
      ? [
          { icon: BarChart3, text: "How many credits does my organization have left?" },
          { icon: MessageCircleQuestion, text: "Show my last 5 orders." },
          { icon: Sparkles, text: "Walk me through inviting a teammate." },
        ]
      : [
          { icon: MessageCircleQuestion, text: "What's the difference between Elsa Workflows and Elsa+?" },
          { icon: Wrench, text: "Show me the active credit bundles for Valence Works." },
          { icon: Sparkles, text: "How do I get started with Elsa Server in Docker?" },
        ];

  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="size-6" />
      </div>
      <div>
        <h3 className="text-base font-semibold">Elsa Copilot</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask about Elsa, the dashboard, or the Runtime Builder. I'll act on what I can and confirm before changing anything.
        </p>
      </div>
      <div className="flex w-full flex-col gap-2">
        {suggestions.map((s) => (
          <Button
            key={s.text}
            variant="outline"
            size="sm"
            className="h-auto justify-start whitespace-normal py-2 text-left"
            onClick={() => onPick(s.text)}
          >
            <s.icon className="size-4 shrink-0 text-muted-foreground" />
            <span className="text-xs">{s.text}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
