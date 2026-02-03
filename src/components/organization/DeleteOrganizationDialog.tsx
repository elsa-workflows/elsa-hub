import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizations } from "@/hooks/useOrganizations";

interface DeleteOrganizationDialogProps {
  organizationId: string;
  organizationName: string;
}

export function DeleteOrganizationDialog({
  organizationId,
  organizationName,
}: DeleteOrganizationDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { refetch } = useOrganizations();

  const isConfirmValid = confirmText === organizationName;

  const handleDelete = async () => {
    if (!isConfirmValid) return;
    
    setIsDeleting(true);

    try {
      // Delete the organization - cascade will handle members
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", organizationId);

      if (error) throw error;

      toast({
        title: "Organization deleted",
        description: `${organizationName} has been permanently deleted`,
      });

      setOpen(false);
      
      // Refetch organizations to update the context switcher
      await refetch();
      
      navigate("/dashboard");
    } catch (error) {
      console.error("Error deleting organization:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete organization",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete organization permanently?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              This action cannot be undone. This will permanently delete{" "}
              <strong>{organizationName}</strong> and all associated data including:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>All team members and their access</li>
              <li>Order and invoice history</li>
              <li>Credit balance and usage records</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Label htmlFor="confirm-name" className="text-sm text-muted-foreground">
            Type <strong>{organizationName}</strong> to confirm
          </Label>
          <Input
            id="confirm-name"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={organizationName}
            className="mt-2"
            disabled={isDeleting}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting || !isConfirmValid}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              "Delete Organization"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
