import { Skeleton } from "@/components/ui/skeleton";

export function CloudLoadingState() {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">Loading engines</span>
      {[0, 1, 2].map((key) => (
        <Skeleton key={key} className="h-20 w-full" />
      ))}
    </div>
  );
}
