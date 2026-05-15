import { useEffect, useState } from "react";
import { FlaskConical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  /** Storage key used to remember dismissal for the session. */
  storageKey?: string;
  className?: string;
  /** Optional shorter variant for tight spaces (composer topbar). */
  compact?: boolean;
}

const DEFAULT_KEY = "elsa-runtime-builder/preview-banner-dismissed";

/**
 * Calls out the Runtime Builder as a public preview running on sample
 * catalog data. Dismissible per browser session (sessionStorage) so it
 * doesn't nag returning visitors but still surfaces on a new session.
 */
export function PreviewBanner({
  storageKey = DEFAULT_KEY,
  className,
  compact = false,
}: Props) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(window.sessionStorage.getItem(storageKey) === "1");
  }, [storageKey]);

  if (dismissed) return null;

  function dismiss() {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(storageKey, "1");
    }
    setDismissed(true);
  }

  return (
    <div
      role="status"
      className={cn(
        "relative overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/5 backdrop-blur-xl",
        compact ? "px-4 py-2.5" : "px-5 py-4",
        className,
      )}
    >
      <div className="flex items-start gap-3 pr-8">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10">
          <FlaskConical className="h-3.5 w-3.5 text-amber-600 dark:text-amber-300" />
        </div>
        <div className="min-w-0 flex-1 text-sm leading-relaxed">
          <p className="font-semibold text-foreground">
            Preview — concept build
          </p>
          <p className="mt-0.5 text-muted-foreground">
            The Runtime Builder is an early prototype showcasing where Elsa+ is
            heading. The image catalog, capabilities, and generated bundle are{" "}
            <span className="text-foreground/90">illustrative samples</span> —
            not yet wired to real registries. Explore the flow to get a feel for
            what's coming.
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Dismiss preview notice"
        className="absolute right-2 top-2 h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={dismiss}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
