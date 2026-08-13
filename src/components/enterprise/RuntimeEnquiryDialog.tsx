import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useOrganizations } from "@/hooks/useOrganizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

export type EnquiryTier = "runtime" | "runtime_priority" | "maintainer_access" | "unsure";

const tierLabels: Record<EnquiryTier, string> = {
  runtime: "Runtime",
  runtime_priority: "Runtime Priority",
  maintainer_access: "Maintainer Access",
  unsure: "Not sure yet",
};

interface RuntimeEnquiryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Service provider that receives the enquiry. */
  providerId: string | undefined;
  /** Tier the visitor was looking at when they opened the dialog. */
  initialTier?: EnquiryTier;
  sourcePage: string;
}

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export function RuntimeEnquiryDialog({
  open,
  onOpenChange,
  providerId,
  initialTier = "unsure",
  sourcePage,
}: RuntimeEnquiryDialogProps) {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { organizations } = useOrganizations();

  const [organizationName, setOrganizationName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [tier, setTier] = useState<EnquiryTier>(initialTier);
  const [message, setMessage] = useState("");
  // Honeypot: hidden from real users. Bots that fill it get a fake success.
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTier(initialTier);
    setSubmitted(false);
  }, [open, initialTier]);

  // Pre-fill from the signed-in user's profile; still editable.
  useEffect(() => {
    if (!open || !user) return;
    setContactEmail((prev) => prev || profile?.email || user.email || "");
    setContactName((prev) => prev || profile?.display_name || "");
    setOrganizationName((prev) => prev || organizations[0]?.name || "");
  }, [open, user, profile, organizations]);

  const handleSubmit = async () => {
    if (!organizationName.trim() || !contactName.trim() || !message.trim()) {
      toast.error("Please fill in organisation, name and what you're trying to do.");
      return;
    }
    if (!isValidEmail(contactEmail.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!providerId) {
      toast.error("Something went wrong. Please try again shortly.");
      return;
    }

    setSubmitting(true);
    try {
      // Honeypot tripped: accept silently, store nothing.
      if (website.trim()) {
        setSubmitted(true);
        return;
      }

      const { data, error } = await supabase
        .from("runtime_enquiries")
        .insert({
          service_provider_id: providerId,
          organization_name: organizationName.trim(),
          contact_name: contactName.trim(),
          contact_email: contactEmail.trim(),
          tier,
          message: message.trim(),
          source_page: sourcePage,
          user_id: user?.id ?? null,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Notifying must never fail the lead. invoke() returns { error } on a
      // non-2xx instead of throwing, so check it explicitly — otherwise a
      // failed notification is silent and the lead sits unread.
      try {
        const { error: notifyError } = await supabase.functions.invoke(
          "notify-runtime-enquiry",
          { body: { enquiryId: data.id } },
        );
        if (notifyError) {
          const details =
            notifyError instanceof FunctionsHttpError
              ? await notifyError.context.text()
              : notifyError.message;
          console.error(
            `Enquiry ${data.id} saved, but notifying the provider failed:`,
            details,
          );
        }
      } catch (notifyError) {
        console.error(
          `Enquiry ${data.id} saved, but notifying the provider threw:`,
          notifyError,
        );
      }


      setSubmitted(true);
    } catch (err) {
      console.error("Runtime enquiry failed:", err);
      toast.error("We couldn't send that. Please try again, or email us directly.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {submitted ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Enquiry received
              </DialogTitle>
              <DialogDescription>
                Thanks — we'll read this and reply by email.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>
                You'll get a reply from Valence Works with an answer to what you asked, and a
                proposed next step from there.
              </p>
              {tier === "maintainer_access" && (
                <p className="rounded-lg border bg-surface-subtle p-4">
                  Maintainer Access is limited to three subscribers. Availability isn't confirmed
                  by this form — it will be confirmed in the reply. If the tier is full, you'll be
                  offered the waitlist and Runtime Priority in the meantime.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Enquire about a Valence Runtime subscription</DialogTitle>
              <DialogDescription>
                Tell us what you need. We'll confirm availability and reply by email — no booking
                required first.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="enquiry-org">Organisation</Label>
                <Input
                  id="enquiry-org"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="Acme B.V."
                  maxLength={200}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="enquiry-name">Your name</Label>
                  <Input
                    id="enquiry-name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Jane Doe"
                    maxLength={200}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enquiry-email">Email</Label>
                  <Input
                    id="enquiry-email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="jane@acme.com"
                    maxLength={320}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="enquiry-tier">Tier you're interested in</Label>
                <Select value={tier} onValueChange={(v) => setTier(v as EnquiryTier)}>
                  <SelectTrigger id="enquiry-tier">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(tierLabels) as EnquiryTier[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {tierLabels[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="enquiry-message">What are you trying to do?</Label>
                <Textarea
                  id="enquiry-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What you're running, what you need from a subscription, and any timing."
                  rows={5}
                  maxLength={5000}
                />
              </div>

              {/* Honeypot — hidden from users, harvested by bots. */}
              <div aria-hidden="true" className="hidden">
                <Label htmlFor="enquiry-website">Website</Label>
                <Input
                  id="enquiry-website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Sending…" : "Send enquiry"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
