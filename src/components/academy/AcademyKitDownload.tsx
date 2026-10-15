import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAcademyKitSignedUrl, type AcademyAsset } from "@/lib/academy";
import { toast } from "sonner";

export function AcademyKitDownload({
  assets,
  title = "Downloads",
}: {
  assets: AcademyAsset[];
  title?: string;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  if (assets.length === 0) return null;

  const onDownload = async (asset: AcademyAsset) => {
    setBusyId(asset.id);
    try {
      const url = await createAcademyKitSignedUrl(asset.storage_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Could not create a download link. Try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3" data-testid="academy-kit-downloads">
      <h2 className="text-lg font-semibold">{title}</h2>
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
              {busyId === asset.id ? "Preparing link..." : asset.label}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
