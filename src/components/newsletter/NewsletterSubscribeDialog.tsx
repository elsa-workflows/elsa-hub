import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface NewsletterSubscribeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  buttonText?: string;
  successMessage?: string;
}

export function NewsletterSubscribeDialog({
  open,
  onOpenChange,
  title = "Get Notified",
  description = "Be the first to know when this becomes available.",
  buttonText = "Notify Me",
  successMessage = "You're on the list! We'll be in touch.",
}: NewsletterSubscribeDialogProps) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("subscribe-newsletter", {
        body: { email, firstName: firstName || undefined },
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        toast.success(data.alreadySubscribed ? "You're already subscribed!" : successMessage);
        setEmail("");
        setFirstName("");
        onOpenChange(false);
      } else {
        toast.error(data.error || "Something went wrong");
      }
    } catch (err) {
      console.error("Newsletter subscription error:", err);
      toast.error("Failed to subscribe. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="firstName">
              First name <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="firstName"
              type="text"
              placeholder="Your first name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>

          <p className="text-xs text-muted-foreground text-center">
            We'll only email you about relevant updates. Unsubscribe anytime.
          </p>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Subscribing..." : buttonText}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
