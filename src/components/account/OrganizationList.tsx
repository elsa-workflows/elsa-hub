import { Building2, Crown, Users, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  role: string;
  created_at: string;
}

interface OrganizationListProps {
  organizations: Organization[];
  loading: boolean;
}

const roleIcons: Record<string, React.ReactNode> = {
  owner: <Crown className="h-3 w-3" />,
  admin: <ShieldCheck className="h-3 w-3" />,
  member: <Users className="h-3 w-3" />,
};

const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

export function OrganizationList({ organizations, loading }: OrganizationListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>You're not a member of any organizations yet.</p>
        <p className="text-sm mt-1">Create one to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {organizations.map((org) => (
        <Card key={org.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  {org.logo_url ? (
                    <img src={org.logo_url} alt={org.name} className="h-6 w-6 rounded" />
                  ) : (
                    <Building2 className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{org.name}</p>
                  <p className="text-sm text-muted-foreground">/{org.slug}</p>
                </div>
              </div>
              <Badge variant="secondary" className="gap-1">
                {roleIcons[org.role]}
                {roleLabels[org.role] || org.role}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
