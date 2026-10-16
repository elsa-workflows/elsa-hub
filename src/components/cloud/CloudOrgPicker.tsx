import { Link } from "react-router-dom";
import { Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CLOUD_PICK_ORG_HEADING, CLOUD_PICK_ORG_MESSAGE } from "@/lib/cloudClient";
import { dashboardCloudHomePath } from "@/lib/cloudPaths";
import { rememberSelectedOrganization } from "@/lib/selectedOrganization";

export function CloudOrgPicker({
  organizations,
  suffix = "",
}: {
  organizations: ReadonlyArray<{ id: string; name: string; slug: string }>;
  suffix?: string;
}) {
  return (
    <section className="p-6">
      <Card className="mx-auto max-w-3xl p-8">
        <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-50" />
        <h2 className="text-center text-lg font-semibold">{CLOUD_PICK_ORG_HEADING}</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">{CLOUD_PICK_ORG_MESSAGE}</p>
        <ul className="mt-4 space-y-2">
          {organizations.map((org) => (
            <li key={org.id}>
              <Link
                to={`${dashboardCloudHomePath(org.slug)}${suffix}`}
                onClick={() => rememberSelectedOrganization({
                  id: org.id,
                  name: org.name,
                  slug: org.slug,
                })}
                className="flex min-h-11 min-w-11 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent"
              >
                {org.name || org.slug}
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
