import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Building2, Settings, Users, Crown, ShieldCheck, User, ShoppingBag, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useProviderDashboard } from "@/hooks/useProviderDashboard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const roleIcons: Record<string, React.ReactNode> = {
  owner: <Crown className="h-3 w-3" />,
  admin: <ShieldCheck className="h-3 w-3" />,
  member: <User className="h-3 w-3" />,
};

const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

export default function ProviderSettings() {
  const { slug } = useParams<{ slug: string }>();
  const { provider, teamMembers, isLoading, notFound, isAdmin } = useProviderDashboard(slug);
  const queryClient = useQueryClient();
  
  // Local state for intake pause toggle
  const [acceptingPurchases, setAcceptingPurchases] = useState<boolean | null>(null);
  const [pauseMessage, setPauseMessage] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  
  // Initialize state from provider data
  const currentAccepting = acceptingPurchases ?? provider?.accepting_new_purchases ?? true;
  const currentMessage = pauseMessage || provider?.purchase_pause_message || "";
  
  const handleIntakePauseToggle = async (checked: boolean) => {
    if (!provider?.id || !isAdmin) return;
    
    setAcceptingPurchases(checked);
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from("service_providers")
        .update({ 
          accepting_new_purchases: checked,
          purchase_pause_message: checked ? null : (currentMessage || null)
        })
        .eq("id", provider.id);
      
      if (error) throw error;
      
      toast.success(checked ? "Now accepting new purchases" : "Purchases paused");
      queryClient.invalidateQueries({ queryKey: ["provider", slug] });
    } catch (err) {
      console.error("Failed to update intake status:", err);
      toast.error("Failed to update status");
      setAcceptingPurchases(!checked); // revert
    } finally {
      setIsSaving(false);
    }
  };
  
  const handlePauseMessageSave = async () => {
    if (!provider?.id || !isAdmin) return;
    
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from("service_providers")
        .update({ purchase_pause_message: pauseMessage || null })
        .eq("id", provider.id);
      
      if (error) throw error;
      
      toast.success("Pause message updated");
      queryClient.invalidateQueries({ queryKey: ["provider", slug] });
    } catch (err) {
      console.error("Failed to update pause message:", err);
      toast.error("Failed to update message");
    } finally {
      setIsSaving(false);
    }
  };

  if (notFound && !isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center px-4">
        <Building2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Provider Not Found</h1>
        <p className="text-muted-foreground mb-6">
          This service provider doesn't exist or you don't have access to it.
        </p>
        <Button asChild>
          <Link to="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Provider Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage settings for {provider?.name}
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Provider Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Provider Details
            </CardTitle>
            <CardDescription>Basic information about your service provider account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <div className="h-5 bg-muted/50 animate-pulse rounded w-32" />
                <div className="h-5 bg-muted/50 animate-pulse rounded w-48" />
              </div>
            ) : (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{provider?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">URL Slug</p>
                  <p className="font-medium font-mono text-sm">/{provider?.slug}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Intake Pause Control - Phase 1 Emergency Brake */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Purchase Intake
              </CardTitle>
              <CardDescription>Control whether new credit purchases are accepted</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="accepting-purchases">Accepting new purchases</Label>
                  <p className="text-sm text-muted-foreground">
                    When disabled, customers cannot purchase new credits
                  </p>
                </div>
                <Switch
                  id="accepting-purchases"
                  checked={currentAccepting}
                  onCheckedChange={handleIntakePauseToggle}
                  disabled={isSaving}
                />
              </div>
              
              {!currentAccepting && (
                <>
                  <Alert className="border-warning/50 bg-warning/5">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertDescription>
                      New purchases are currently paused. Customers will see a message explaining this when attempting to check out.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <Label htmlFor="pause-message">Custom pause message (optional)</Label>
                    <Textarea
                      id="pause-message"
                      placeholder="We're temporarily limiting new purchases to ensure quality and availability."
                      value={currentMessage}
                      onChange={(e) => setPauseMessage(e.target.value)}
                      rows={3}
                    />
                    <div className="flex justify-end">
                      <Button 
                        size="sm" 
                        onClick={handlePauseMessageSave}
                        disabled={isSaving || currentMessage === (provider?.purchase_pause_message || "")}
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Save Message
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members
            </CardTitle>
            <CardDescription>
              {teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""} on your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-muted/50 animate-pulse rounded" />
                ))}
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No team members.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {member.display_name || member.email || `${member.user_id.slice(0, 8)}...`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Joined {format(new Date(member.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="gap-1">
                      {roleIcons[member.role]}
                      {roleLabels[member.role] || member.role}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
