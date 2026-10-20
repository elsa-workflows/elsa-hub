import type { ReactNode } from "react";
import { Cloud } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CLOUD_EMPTY_MESSAGE } from "@/lib/cloudClient";

export function CloudEmptyState({ action }: { action?: ReactNode }) {
  return (
    <Card className="p-8 text-center text-muted-foreground">
      <Cloud className="mx-auto mb-3 h-10 w-10 opacity-50" />
      <p className="text-sm font-medium">{CLOUD_EMPTY_MESSAGE}</p>
      <p className="mt-1 text-xs">
        When an Elsa Cloud engine is ready, it will appear here.
      </p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </Card>
  );
}
