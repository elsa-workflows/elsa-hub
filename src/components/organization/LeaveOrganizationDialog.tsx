import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface LeaveOrganizationDialogProps {
  organizationId: string;
  organizationName: string;
  userRole: string;
}

export function LeaveOrganizationDialog({
  organizationId,
  organizationName,
  userRole,
}: LeaveOrganizationDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isOwner = userRole === "owner";

  const handleLeave = async () => {
    if (!user) return;
    
    setIsLeaving(true);

    try {
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("organization_id", organizationId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Left organization",
        description: `You have left ${organizationName}`,
      });

      setOpen(false);
      navigate("/dashboard");
    } catch (error) {
      console.error("Error leaving organization:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to leave organization",
        variant: "destructive",
      });
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={isOwner}>
          <LogOut className="h-4 w-4 mr-2" />
          Leave
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave organization?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to leave <strong>{organizationName}</strong>?
            You will lose access to all organization resources and will need to
            be re-invited to rejoin.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLeaving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleLeave}
            disabled={isLeaving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLeaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Leaving...
              </>
            ) : (
              "Leave Organization"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
