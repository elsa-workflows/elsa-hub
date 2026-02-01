import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
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

interface DeleteUserDialogProps {
  userId: string;
  userEmail: string;
  displayName?: string | null;
  organizationCount: number;
  onDeleted?: () => void;
}

export function DeleteUserDialog({
  userId,
  userEmail,
  displayName,
  organizationCount,
  onDeleted,
}: DeleteUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const { toast } = useToast();

  const isConfirmValid = confirmText === userEmail;

  const handleDelete = async () => {
    if (!isConfirmValid) return;

    setIsDeleting(true);

    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { userId },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "User deleted",
        description: `${displayName || userEmail} has been permanently deleted`,
      });

      if (data?.stripeWarnings?.length > 0) {
        toast({
          title: "Stripe cleanup warnings",
          description: data.stripeWarnings.join(", "),
          variant: "destructive",
        });
      }

      setOpen(false);
      setConfirmText("");
      onDeleted?.();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete user</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete user permanently?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              This action cannot be undone. This will permanently delete{" "}
              <strong>{displayName || userEmail}</strong> and all associated data including:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>User account and profile</li>
              {organizationCount > 0 && (
                <li>
                  Organizations where they are the sole owner ({organizationCount} org
                  {organizationCount > 1 ? "s" : ""})
                </li>
              )}
              <li>All orders, invoices, credits, and work logs for owned organizations</li>
              <li>Stripe subscriptions and customer records</li>
              <li>Organization memberships in other organizations</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Label htmlFor="confirm-email" className="text-sm text-muted-foreground">
            Type <strong>{userEmail}</strong> to confirm
          </Label>
          <Input
            id="confirm-email"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={userEmail}
            className="mt-2"
            disabled={isDeleting}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting} onClick={() => setConfirmText("")}>
            Cancel
          </AlertDialogCancel>
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
              "Delete User"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
