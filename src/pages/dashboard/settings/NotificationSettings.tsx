import { Bell, Mail, ShoppingCart, Clock, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { useProviderMemberships } from "@/hooks/useProviderMemberships";
import { useOrganizations } from "@/hooks/useOrganizations";

export default function NotificationSettings() {
  const { preferences, isLoading, updatePreferences, isUpdating } = useNotificationPreferences();
  const { providers: providerMemberships } = useProviderMemberships();
  const { organizations } = useOrganizations();

  const isProvider = providerMemberships && providerMemberships.length > 0;
  const isOrgMember = organizations && organizations.length > 0;

  if (isLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Notification Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage how you receive notifications
          </p>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleToggle = (field: string, value: boolean) => {
    updatePreferences({ [field]: value });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage how you receive notifications
        </p>
      </div>

      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Bell className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Email Notifications</CardTitle>
          <CardDescription>
            Choose which emails you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Master toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="email_enabled" className="text-base font-medium">
                  Email notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
            </div>
            <Switch
              id="email_enabled"
              checked={preferences?.email_enabled ?? true}
              onCheckedChange={(checked) => handleToggle("email_enabled", checked)}
              disabled={isUpdating}
            />
          </div>

          {/* Granular toggles - only show when master is enabled */}
          {preferences?.email_enabled && (
            <div className="space-y-4 pl-4 border-l-2 border-muted">
              {/* Purchase notifications - for providers */}
              {isProvider && (
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label htmlFor="notify_purchase" className="text-base">
                        Credit purchases
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        When customers purchase credits
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="notify_purchase"
                    checked={preferences?.notify_purchase ?? true}
                    onCheckedChange={(checked) => handleToggle("notify_purchase", checked)}
                    disabled={isUpdating}
                  />
                </div>
              )}

              {/* Work logged notifications - for org members */}
              {isOrgMember && (
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label htmlFor="notify_work_logged" className="text-base">
                        Work logged
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        When providers log work to your organization
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="notify_work_logged"
                    checked={preferences?.notify_work_logged ?? true}
                    onCheckedChange={(checked) => handleToggle("notify_work_logged", checked)}
                    disabled={isUpdating}
                  />
                </div>
              )}

              {/* Subscription notifications - for everyone */}
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="notify_subscription" className="text-base">
                      Subscription updates
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Renewals, cancellations, and plan changes
                    </p>
                  </div>
                </div>
                <Switch
                  id="notify_subscription"
                  checked={preferences?.notify_subscription ?? true}
                  onCheckedChange={(checked) => handleToggle("notify_subscription", checked)}
                  disabled={isUpdating}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
