import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function FooterNewsletterSignup() {
  const [email, setEmail] = useState("");
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
        body: { email },
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        toast.success(data.alreadySubscribed ? "You're already subscribed!" : "Thanks for subscribing!");
        setEmail("");
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
    <div className="space-y-3">
      <h4 className="font-semibold">Stay Updated</h4>
      <p className="text-sm text-muted-foreground">
        Release updates and ecosystem news.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <label htmlFor="footer-newsletter-email" className="sr-only">
          Email address
        </label>
        <Input
          id="footer-newsletter-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 h-9 text-sm"
          required
          aria-label="Email address"
        />
        <Button
          type="submit"
          size="sm"
          disabled={isLoading}
          className="h-9 px-3"
          aria-label={isLoading ? "Subscribing…" : "Subscribe to newsletter"}
        >
          {isLoading ? (
            <span aria-hidden="true" className="animate-pulse">...</span>
          ) : (
            <Send aria-hidden="true" className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
