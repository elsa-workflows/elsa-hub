import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ACADEMY_PATH } from "@/lib/academy";

export function AcademyLoadingState({ label = "Loading Academy..." }: { label?: string }) {
  return (
    <div className="container max-w-5xl py-16">
      <p className="sr-only">{label}</p>
      <Skeleton className="h-8 w-48 mb-6" />
      <Skeleton className="h-12 w-2/3 mb-4" />
      <Skeleton className="h-5 w-full max-w-xl mb-10" />
      <div className="grid gap-6 sm:grid-cols-2">
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function AcademyErrorState({
  title = "Could not load Academy",
  message,
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="container max-w-2xl py-24">
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 flex gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
        <div>
          <p className="font-medium">{title}</p>
          {message && <p className="text-sm text-muted-foreground mt-1">{message}</p>}
        </div>
      </div>
      <Button asChild variant="ghost" className="mt-6">
        <Link to={ACADEMY_PATH}>Back to Academy</Link>
      </Button>
    </div>
  );
}

export function AcademyEmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-lg border border-dashed p-10 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground mt-2">{message}</p>
    </div>
  );
}

export function AcademyNotFoundState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="container max-w-2xl py-24 text-center">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="text-muted-foreground mt-3">{message}</p>
      <Button asChild className="mt-6">
        <Link to={ACADEMY_PATH}>Back to Academy</Link>
      </Button>
    </div>
  );
}
