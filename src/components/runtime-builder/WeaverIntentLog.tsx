import { useEffect, useState } from "react";
import { Activity, CheckCircle2, ChevronDown, ChevronUp, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIntentLog, type IntentLogPhase } from "@/lib/weaver/intent-log";
import { cn } from "@/lib/utils";

function PhaseIcon({ phase }: { phase: IntentLogPhase }) {
  switch (phase) {
    case "start":
      return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
    case "applied":
      return <CheckCircle2 className="h-3 w-3 text-emerald-400" />;
    case "error":
      return <XCircle className="h-3 w-3 text-destructive" />;
    default:
      return <Activity className="h-3 w-3 text-muted-foreground" />;
  }
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function WeaverIntentLog() {
  const entries = useIntentLog((s) => s.entries);
  const clear = useIntentLog((s) => s.clear);
  const [open, setOpen] = useState(true);
  const [pulse, setPulse] = useState(false);

  // Briefly highlight the panel whenever a new entry arrives.
  useEffect(() => {
    if (entries.length === 0) return;
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 600);
    return () => clearTimeout(t);
  }, [entries.length, entries[0]?.id]);

  if (entries.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-background/40 p-3 transition-colors",
        pulse && "border-primary/60 bg-primary/5",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
      >
        <span className="flex items-center gap-1.5">
          <Activity className="h-3 w-3" />
          Weaver activity ({entries.length})
        </span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {open && (
        <>
          <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto pr-1 text-[11px]">
            {entries.map((e) => (
              <li key={e.id} className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">
                  <PhaseIcon phase={e.phase} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-foreground">{e.message}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {formatTime(e.ts)} · {e.kind}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-muted-foreground"
              onClick={clear}
            >
              Clear
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
