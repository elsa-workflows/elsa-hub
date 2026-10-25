import { cn } from "@/lib/utils";

export function RouteFallback({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-h-screen items-center justify-center", className)}>
      <div className="animate-pulse text-muted-foreground">Loading…</div>
    </div>
  );
}
