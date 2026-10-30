import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAcademyKitSignedUrl, type AcademyAsset } from "@/lib/academy";
import { toast } from "sonner";

export function AcademyKitDownload({
  assets,
  title = "Downloads",
  buttonLabel,
  testId = "academy-kit-downloads",
}: {
  assets: AcademyAsset[];
  /** null renders no heading, for a download placed inside other content. */
  title?: string | null;
  /** Replaces each asset label on its button. */
  buttonLabel?: string;
  testId?: string;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  if (assets.length === 0) return null;

  const onDownload = async (asset: AcademyAsset) => {
    setBusyId(asset.id);
    try {
      const url = await createAcademyKitSignedUrl(asset.storage_path);
      window.location.assign(url);
    } catch {
      toast.error("Could not create a download link. Try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3" data-testid={testId}>
      {title !== null && <h2 className="text-lg font-semibold">{title}</h2>}
      <ul className="space-y-2">
        {assets.map((asset) => (
          <li key={asset.id}>
            <Button
              type="button"
              variant="outline"
              onClick={() => onDownload(asset)}
              disabled={busyId === asset.id}
            >
              <Download className="h-4 w-4" />
              {busyId === asset.id ? "Preparing link..." : (buttonLabel ?? asset.label)}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
