import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useOrganizations } from "@/hooks/useOrganizations";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import {
  companySizeOptions,
  deliveryOptions,
  dialogCopy,
  emptyTrainingInterestForm,
  languageOptions,
  offeringOptions,
  preferredLengthOptions,
  regionOptions,
  roleOptions,
  seatInterestOptions,
  startMonthOptions,
  toggleListValue,
  validateTrainingInterest,
  type TrainingInterestForm,
  type TrainingInterestIntent,
} from "@/lib/trainingInterest";

interface TrainingInterestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intent: TrainingInterestIntent;
  sourcePage?: string;
}

function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <Label htmlFor={htmlFor}>
      {children}
      {required ? "" : (
        <span className="text-muted-foreground font-normal"> (optional)</span>
      )}
    </Label>
  );
}

export function TrainingInterestDialog({
  open,
  onOpenChange,
  intent,
  sourcePage = "/elsa-plus/training",
}: TrainingInterestDialogProps) {
  const copy = dialogCopy[intent];
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { organizations } = useOrganizations();
  const monthOptions = useMemo(() => startMonthOptions(), []);

  const [form, setForm] = useState<TrainingInterestForm>(emptyTrainingInterestForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSubmitted(false);
    setForm(emptyTrainingInterestForm());
  }, [open, intent]);

  useEffect(() => {
    if (!open || !user) return;
    setForm((prev) => ({
      ...prev,
      email: prev.email || profile?.email || user.email || "",
      contactName: prev.contactName || profile?.display_name || "",
      company: prev.company || organizations[0]?.name || "",
      organizationName: prev.organizationName || organizations[0]?.name || "",
    }));
  }, [open, user, profile, organizations]);

  const setField = <K extends keyof TrainingInterestForm>(key: K, value: TrainingInterestForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const result = validateTrainingInterest(intent, form, {
      sourcePage,
      userId: user?.id ?? null,
    });
    if (result.ok === false) {
      toast.error(result.error);
      return;
    }

    setSubmitting(true);
    try {
      if (form.honeypot.trim()) {
        setSubmitted(true);
        return;
      }

      const { error } = await supabase.from("training_leads").insert(result.insert);
      if (error) throw error;

      if (result.subscribe) {
        try {
          const { error: subscribeError } = await supabase.functions.invoke("subscribe-newsletter", {
            body: {
              email: result.insert.email,
              firstName: result.insert.contact_name?.split(/\s+/)[0],
              company: result.insert.company ?? result.insert.organization_name ?? undefined,
            },
          });
          if (subscribeError) {
            console.error("Training lead saved, but newsletter subscribe failed:", subscribeError);
          }
        } catch (subscribeError) {
          console.error("Training lead saved, but newsletter subscribe threw:", subscribeError);
        }
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Training interest failed:", err);
      toast.error("We couldn’t send that. Please try again, or email us directly.");
    } finally {
      setSubmitting(false);
    }
  };

  const showBuyerFields = intent === "notify" || intent === "quote";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {submitted ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                {copy.title}
              </DialogTitle>
              <DialogDescription>{copy.successMessage}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{copy.title}</DialogTitle>
              <DialogDescription>{copy.description}</DialogDescription>
            </DialogHeader>

            {intent === "provider" ? (
              <div className="space-y-2">
                <FieldLabel htmlFor="training-org" required>
                  Organisation
                </FieldLabel>
                <Input
                  id="training-org"
                  value={form.organizationName}
                  onChange={(e) => setField("organizationName", e.target.value)}
                  placeholder="Partner Academy"
                  maxLength={200}
                  autoComplete="organization"
                />
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="training-name" required={intent === "provider"}>
                  {intent === "provider" ? "Contact name" : "Name"}
                </FieldLabel>
                <Input
                  id="training-name"
                  value={form.contactName}
                  onChange={(e) => setField("contactName", e.target.value)}
                  placeholder="Jane Doe"
                  maxLength={200}
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="training-email" required>
                  Email
                </FieldLabel>
                <Input
                  id="training-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="jane@acme.com"
                  maxLength={320}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {showBuyerFields ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel htmlFor="training-role">Role</FieldLabel>
                    <Select value={form.role} onValueChange={(v) => setField("role", v)}>
                      <SelectTrigger id="training-role">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="training-company">Company</FieldLabel>
                    <Input
                      id="training-company"
                      value={form.company}
                      onChange={(e) => setField("company", e.target.value)}
                      placeholder="Acme B.V."
                      maxLength={200}
                      autoComplete="organization"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel htmlFor="training-size">Company size</FieldLabel>
                    <Select
                      value={form.companySize}
                      onValueChange={(v) => setField("companySize", v)}
                    >
                      <SelectTrigger id="training-size">
                        <SelectValue placeholder="Select a size" />
                      </SelectTrigger>
                      <SelectContent>
                        {companySizeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="training-length">Preferred length</FieldLabel>
                    <Select
                      value={form.preferredLength}
                      onValueChange={(v) =>
                        setField("preferredLength", v as TrainingInterestForm["preferredLength"])
                      }
                    >
                      <SelectTrigger id="training-length">
                        <SelectValue placeholder="Half-day or one-day" />
                      </SelectTrigger>
                      <SelectContent>
                        {preferredLengthOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Interest</p>
                  <RadioGroup
                    value={form.interest}
                    onValueChange={(v) =>
                      setField("interest", v as TrainingInterestForm["interest"])
                    }
                    className="grid gap-2 sm:grid-cols-3"
                  >
                    {seatInterestOptions.map((option) => (
                      <div key={option.value} className="flex items-center gap-2">
                        <RadioGroupItem value={option.value} id={`training-interest-${option.value}`} />
                        <Label htmlFor={`training-interest-${option.value}`} className="font-normal">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <FieldLabel htmlFor="training-start">Preferred start month</FieldLabel>
                  <Select value={form.startMonth} onValueChange={(v) => setField("startMonth", v)}>
                    <SelectTrigger id="training-start">
                      <SelectValue placeholder="When would you like to start?" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : null}

            {intent === "quote" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel htmlFor="training-headcount" required>
                      Headcount
                    </FieldLabel>
                    <Input
                      id="training-headcount"
                      type="number"
                      min={1}
                      max={500}
                      inputMode="numeric"
                      value={form.headcount}
                      onChange={(e) => setField("headcount", e.target.value)}
                      placeholder="8"
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="training-delivery">Delivery</FieldLabel>
                    <Select
                      value={form.delivery}
                      onValueChange={(v) =>
                        setField("delivery", v as TrainingInterestForm["delivery"])
                      }
                    >
                      <SelectTrigger id="training-delivery">
                        <SelectValue placeholder="Remote, on-site, either" />
                      </SelectTrigger>
                      <SelectContent>
                        {deliveryOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="training-tz">Timezone / region</FieldLabel>
                  <Select
                    value={form.timezoneRegion}
                    onValueChange={(v) => setField("timezoneRegion", v)}
                  >
                    <SelectTrigger id="training-tz">
                      <SelectValue placeholder="Select a region" />
                    </SelectTrigger>
                    <SelectContent>
                      {regionOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : null}

            {intent === "provider" ? (
              <>
                <div className="space-y-2">
                  <FieldLabel htmlFor="training-website">Website</FieldLabel>
                  <Input
                    id="training-website"
                    type="url"
                    value={form.website}
                    onChange={(e) => setField("website", e.target.value)}
                    placeholder="https://example.com"
                    maxLength={500}
                    autoComplete="url"
                  />
                </div>

                <CheckboxGroup
                  legend="Regions"
                  required
                  options={regionOptions.map((value) => ({ value, label: value }))}
                  selected={form.regions}
                  onToggle={(value) => setField("regions", toggleListValue(form.regions, value))}
                />
                <CheckboxGroup
                  legend="Languages"
                  required
                  options={languageOptions.map((value) => ({ value, label: value }))}
                  selected={form.languages}
                  onToggle={(value) => setField("languages", toggleListValue(form.languages, value))}
                />
                <CheckboxGroup
                  legend="Offerings"
                  required
                  options={offeringOptions}
                  selected={form.offerings}
                  onToggle={(value) => setField("offerings", toggleListValue(form.offerings, value))}
                />

                <div className="space-y-2">
                  <FieldLabel htmlFor="training-experience" required>
                    Experience
                  </FieldLabel>
                  <Textarea
                    id="training-experience"
                    value={form.experience}
                    onChange={(e) => setField("experience", e.target.value)}
                    placeholder="Years delivering .NET / Elsa workshops, typical audience, and any published outlines."
                    rows={4}
                    maxLength={5000}
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="training-outline">Outline URL</FieldLabel>
                  <Input
                    id="training-outline"
                    type="url"
                    value={form.outlineUrl}
                    onChange={(e) => setField("outlineUrl", e.target.value)}
                    placeholder="https://example.com/elsa-fundamentals"
                    maxLength={500}
                  />
                </div>
              </>
            ) : null}

            {(intent === "quote" || intent === "provider") && (
              <div className="space-y-2">
                <FieldLabel htmlFor="training-notes">Notes</FieldLabel>
                <Textarea
                  id="training-notes"
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder={
                    intent === "quote"
                      ? "Timing, constraints, or what the team already knows about Elsa."
                      : "Anything else we should know about listing or partnership."
                  }
                  rows={4}
                  maxLength={5000}
                />
              </div>
            )}

            <div aria-hidden="true" className="hidden">
              <Label htmlFor="training-website-hp">Website</Label>
              <Input
                id="training-website-hp"
                tabIndex={-1}
                autoComplete="off"
                value={form.honeypot}
                onChange={(e) => setField("honeypot", e.target.value)}
              />
            </div>

            <p className="text-xs text-muted-foreground text-center">
              We’ll only email you about Elsa+ Training dates and quotes.
            </p>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Sending…" : copy.buttonText}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CheckboxGroup({
  legend,
  required,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  required?: boolean;
  options: readonly { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">
        {legend}
        {required ? "" : <span className="text-muted-foreground font-normal"> (optional)</span>}
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const id = `training-${legend.toLowerCase()}-${option.value}`;
          return (
            <div key={option.value} className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={selected.includes(option.value)}
                onCheckedChange={() => onToggle(option.value)}
              />
              <Label htmlFor={id} className="font-normal">
                {option.label}
              </Label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
