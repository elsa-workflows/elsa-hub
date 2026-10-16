import { Link, useParams } from "react-router-dom";
import { CLOUD_MANAGE_LINK } from "@/lib/cloudClient";
import { dashboardCloudHomePath } from "@/lib/cloudPaths";

export function CloudManageLink({ className }: { className?: string }) {
  const { slug } = useParams<{ slug?: string }>();

  return (
    <Link
      to={dashboardCloudHomePath(slug)}
      className={
        className ??
        "inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      }
    >
      {CLOUD_MANAGE_LINK}
    </Link>
  );
}
