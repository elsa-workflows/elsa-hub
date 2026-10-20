import { Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CLOUD_SETUP_ACTION, CLOUD_SETUP_HEADING, CLOUD_SETUP_MESSAGE } from "@/lib/cloudClient";

export function CloudSetupState({
  onSetup,
  pending = false,
}: {
  onSetup: () => void;
  pending?: boolean;
}) {
  return (
    <Card className="p-8 text-center">
      <Cloud className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-50" />
      <h2 className="text-lg font-semibold">{CLOUD_SETUP_HEADING}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{CLOUD_SETUP_MESSAGE}</p>
      <Button type="button" className="mt-4" onClick={onSetup} disabled={pending}>
        {CLOUD_SETUP_ACTION}
      </Button>
    </Card>
  );
}
