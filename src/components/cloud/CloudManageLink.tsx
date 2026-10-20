import { ExternalLink } from "lucide-react";
import { CLOUD_MANAGE_LINK } from "@/lib/cloudClient";
import { ELSACLOUD_APP_URL } from "@/lib/cloudPaths";

export function CloudManageLink({ className }: { className?: string }) {
  return (
    <a
      href={ELSACLOUD_APP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ??
        "inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      }
    >
      {CLOUD_MANAGE_LINK}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}
