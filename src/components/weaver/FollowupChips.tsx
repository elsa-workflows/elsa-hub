import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FollowupChipsProps {
  followups: string[];
  onPick: (text: string) => void;
  disabled?: boolean;
}

export function FollowupChips({ followups, onPick, disabled }: FollowupChipsProps) {
  if (!followups.length) return null;
  return (
    <div
      className="mt-3 flex flex-wrap gap-2"
      role="group"
      aria-label="Suggested follow-up questions"
    >
      {followups.map((q) => (
        <Button
          key={q}
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onPick(q)}
          className="h-auto whitespace-normal rounded-full border-border/60 bg-background/40 px-3 py-1.5 text-left text-xs font-normal text-muted-foreground hover:text-foreground"
        >
          <span className="line-clamp-2">{q}</span>
          <ArrowUpRight className="ml-1.5 size-3 shrink-0 opacity-60" aria-hidden />
        </Button>
      ))}
    </div>
  );
}
