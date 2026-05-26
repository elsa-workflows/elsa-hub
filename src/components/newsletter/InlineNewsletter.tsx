import { useState } from "react";
import { Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface InlineNewsletterProps {
  variant?: "default" | "compact";
  heading?: string;
  description?: string;
  className?: string;
}

/**
 * Tasteful inline newsletter capture, designed to live mid-content
 * (end of a blog post, Home page section, Blog index footer).
 * Reuses the same `subscribe-newsletter` edge function as the footer signup.
 */
export function InlineNewsletter({
  variant = "default",
  heading = "Get the Elsa digest",
  description = "Release notes, deep dives, and ecosystem news. One email a month. Unsubscribe anytime.",
  className = "",
}: InlineNewsletterProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

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
      if (error) throw error;
      if (data?.success) {
        toast.success(
          data.alreadySubscribed ? "You're already subscribed!" : "Thanks for subscribing!"
        );
        setEmail("");
        setDone(true);
      } else {
        toast.error(data?.error || "Something went wrong");
      }
    } catch (err) {
      console.error("Newsletter subscription error:", err);
      toast.error("Failed to subscribe. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const isCompact = variant === "compact";

  return (
    <div
      className={`rounded-xl border border-border bg-surface-subtle/60 ${
        isCompact ? "p-5 md:p-6" : "p-6 md:p-8"
      } ${className}`}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-5">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-lg border border-border bg-background flex items-center justify-center">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className={`font-semibold ${isCompact ? "text-base" : "text-lg"}`}>
              {heading}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
        {done ? (
          <p className="text-sm font-medium text-primary md:text-right md:min-w-[12rem]">
            You're on the list.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex w-full md:w-auto md:min-w-[22rem] gap-2"
          >
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 h-10"
              required
              aria-label="Email address"
            />
            <Button type="submit" disabled={isLoading} className="h-10 gap-2 shrink-0">
              {isLoading ? (
                <span className="animate-pulse">…</span>
              ) : (
                <>
                  Subscribe
                  <Send className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
