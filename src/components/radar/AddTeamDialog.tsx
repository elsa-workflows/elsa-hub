import { useState } from "react";
import { z } from "zod";
import { Check, ChevronLeft, ChevronRight, ChevronsUpDown, Globe2, MapPin, Sparkles, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { elsaIndustries, elsaRegions } from "@/data/elsaUsageLocations";
import { countries, countryByName } from "@/data/countries";


const teamSchema = z.object({
  companyName: z.string().trim().min(2, "Team name is required").max(80),
  websiteUrl: z
    .string()
    .trim()
    .max(255)
    .url("Enter a valid URL (https://…)")
    .optional()
    .or(z.literal("")),
  contactEmail: z.string().trim().email("Enter a valid email").max(255),
  city: z.string().trim().min(1, "City is required").max(80),
  country: z.string().trim().min(1, "Country is required").max(80),
  region: z.enum(["Europe", "North America", "South America", "Asia", "Africa", "Oceania"]),
  industry: z.string().trim().min(1, "Pick an industry").max(80),
  description: z
    .string()
    .trim()
    .min(20, "Tell us a little more (20+ chars)")
    .max(560, "Keep it under 560 characters"),
  usingSince: z
    .number({ invalid_type_error: "Year is required" })
    .int()
    .min(2018)
    .max(new Date().getFullYear()),
  visibility: z.enum(["showcase", "anonymous"]),
  consent: z.literal(true, {
    errorMap: () => ({ message: "You must confirm authorisation" }),
  }),
});

type TeamForm = z.infer<typeof teamSchema>;

interface AddTeamDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const steps = [
  { key: "identity", label: "Team", icon: Globe2 },
  { key: "location", label: "Location", icon: MapPin },
  { key: "story", label: "Story", icon: Sparkles },
  { key: "preview", label: "Preview", icon: Send },
] as const;

const initial: Partial<TeamForm> = {
  companyName: "",
  websiteUrl: "",
  contactEmail: "",
  city: "",
  country: "",
  region: "Europe",
  industry: elsaIndustries[0],
  description: "",
  usingSince: new Date().getFullYear(),
  visibility: "showcase",
  consent: false as unknown as true,
};

export function AddTeamDialog({ open, onOpenChange }: AddTeamDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Partial<TeamForm>>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof TeamForm>(k: K, v: TeamForm[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const validateStep = (idx: number): boolean => {
    const keys: (keyof TeamForm)[][] = [
      ["companyName", "websiteUrl", "contactEmail"],
      ["city", "country", "region"],
      ["industry", "description", "usingSince", "visibility"],
      ["consent"],
    ];
    const subset = z.object(
      Object.fromEntries(
        keys[idx].map((k) => [k, (teamSchema.shape as any)[k]]),
      ) as any,
    );
    const res = subset.safeParse(data);
    if (res.success) {
      setErrors({});
      return true;
    }
    const errMap: Record<string, string> = {};
    res.error.errors.forEach((e) => {
      errMap[String(e.path[0])] = e.message;
    });
    setErrors(errMap);
    return false;
  };

  const next = () => {
    if (validateStep(step)) setStep((s) => Math.min(steps.length - 1, s + 1));
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const handleSubmit = async () => {
    if (!validateStep(3)) {
      toast({
        title: "Confirmation required",
        description: "Please tick the authorisation checkbox to submit.",
        variant: "destructive",
      });
      return;
    }
    const final = teamSchema.safeParse(data);
    if (!final.success) {
      toast({
        title: "Form incomplete",
        description: final.error.errors[0]?.message ?? "Please review your inputs.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.functions.invoke("submit-radar-location", {
        body: {
          companyName: final.data.companyName,
          websiteUrl: final.data.websiteUrl || "",
          contactEmail: final.data.contactEmail,
          city: final.data.city,
          country: final.data.country,
          region: final.data.region,
          industry: final.data.industry,
          description: final.data.description,
          usingSince: final.data.usingSince,
          visibility: final.data.visibility,
        },
      });
      if (error) throw error;
      toast({
        title: "Check your inbox",
        description:
          "We sent a confirmation link to your email. Click it to send your submission to the review queue.",
      });
      onOpenChange(false);
      setStep(0);
      setData(initial);
      setErrors({});
    } catch (e) {
      toast({
        title: "Submission failed",
        description: e instanceof Error ? e.message : "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };


  const StepIcon = steps[step].icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="border-b border-border px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <StepIcon className="h-4 w-4 text-primary" />
            Add your team to the radar
          </DialogTitle>
          <Stepper current={step} />
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-6">

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {step === 0 && (
                <>
                  <Field label="Team or company name" error={errors.companyName} required>
                    <Input
                      value={data.companyName ?? ""}
                      maxLength={80}
                      onChange={(e) => set("companyName", e.target.value)}
                      placeholder="Acme Workflows"
                    />
                  </Field>
                  <Field label="Website" error={errors.websiteUrl} hint="Optional, but recommended.">
                    <Input
                      value={data.websiteUrl ?? ""}
                      maxLength={255}
                      onChange={(e) => set("websiteUrl", e.target.value)}
                      placeholder="https://example.com"
                    />
                  </Field>
                  <Field
                    label="Contact email"
                    error={errors.contactEmail}
                    hint="Only used to verify your submission. Never shown publicly."
                    required
                  >
                    <Input
                      type="email"
                      value={data.contactEmail ?? ""}
                      maxLength={255}
                      onChange={(e) => set("contactEmail", e.target.value)}
                      placeholder="you@example.com"
                    />
                  </Field>
                </>
              )}

              {step === 1 && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="City" error={errors.city} required>
                      <Input
                        value={data.city ?? ""}
                        maxLength={80}
                        onChange={(e) => set("city", e.target.value)}
                        placeholder="Amsterdam"
                      />
                    </Field>
                    <Field label="Country" error={errors.country} required>
                      <CountryCombobox
                        value={data.country ?? ""}
                        onChange={(name) => {
                          set("country", name);
                          const c = countryByName(name);
                          if (c) set("region", c.region as TeamForm["region"]);
                        }}
                      />
                    </Field>

                  </div>
                  <Field label="Region" error={errors.region} required>
                    <Select
                      value={data.region}
                      onValueChange={(v) => set("region", v as TeamForm["region"])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pick a region" />
                      </SelectTrigger>
                      <SelectContent>
                        {elsaRegions.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Industry" error={errors.industry} required>
                      <Select
                        value={data.industry}
                        onValueChange={(v) => set("industry", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pick an industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {elsaIndustries.map((i) => (
                            <SelectItem key={i} value={i}>
                              {i}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Using Elsa since" error={errors.usingSince} required>
                      <Input
                        type="number"
                        min={2018}
                        max={new Date().getFullYear()}
                        value={data.usingSince ?? ""}
                        onChange={(e) =>
                          set("usingSince", Number(e.target.value) as TeamForm["usingSince"])
                        }
                      />
                    </Field>
                  </div>
                  <Field
                    label="What are you building?"
                    error={errors.description}
                    hint={`${(data.description ?? "").length}/560`}
                    required
                  >
                    <Textarea
                      value={data.description ?? ""}
                      maxLength={560}
                      rows={4}
                      onChange={(e) => set("description", e.target.value)}
                      placeholder="Durable workflow systems for regulated industries…"
                    />
                  </Field>
                  <Field label="Visibility" error={errors.visibility}>
                    <RadioGroup
                      value={data.visibility}
                      onValueChange={(v) => set("visibility", v as TeamForm["visibility"])}
                      className="grid gap-2 sm:grid-cols-2"
                    >
                      <RadioOption
                        value="showcase"
                        title="Public showcase"
                        description="Name, location, and description shown on the radar."
                      />
                      <RadioOption
                        value="anonymous"
                        title="Anonymous pin"
                        description="Only approximate region — no name or details."
                    </RadioGroup>
                  </Field>
                </>
              )}

              {step === 3 && (
                <PreviewCard
                  data={data as TeamForm}
                  error={errors.consent}
                  onConsent={(v) => set("consent", v as true)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-4">

          <Button
            type="button"
            variant="ghost"
            onClick={back}
            disabled={step === 0 || submitting}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          {step < steps.length - 1 ? (
            <Button
              type="button"
              onClick={next}
            >
              Continue
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Submitting…" : "Submit for review"}
              <Send className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="mt-3 flex items-center gap-1.5">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.key} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-[10px]",
                done && "border-primary/60 bg-primary/10 text-primary",
                active && "border-primary bg-primary text-primary-foreground",
                !done && !active && "border-border text-muted-foreground",
              )}
            >
              {done ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span
              className={cn(
                "hidden font-mono text-[10px] uppercase tracking-[0.18em] sm:inline",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <span
                className={cn(
                  "h-px flex-1",
                  done ? "bg-primary/40" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12px] font-medium text-foreground/80">
        {label}
        {required && <span className="ml-1 text-primary">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-[11px] text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function RadioOption({
  value,
  title,
  description,
}: {
  value: string;
  title: string;
  description: string;
}) {
  return (
    <Label
      htmlFor={`vis-${value}`}
      className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40 [&:has(:checked)]:border-primary/60 [&:has(:checked)]:bg-primary/5"
    >
      <RadioGroupItem id={`vis-${value}`} value={value} className="mt-0.5" />
      <div>
        <div className="text-[13px] font-medium text-foreground">{title}</div>
        <div className="text-[11.5px] text-muted-foreground">{description}</div>
      </div>
    </Label>
  );
}

function PreviewCard({
  data,
  error,
  onConsent,
}: {
  data: TeamForm;
  error?: string;
  onConsent: (v: boolean) => void;
}) {
  const anonymous = data.visibility === "anonymous";
  return (
    <div className="space-y-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary/80">
        Preview · how it will appear
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3 text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
          {anonymous ? "Anonymous signal" : "Showcase deployment"}
        </div>
        <div className="space-y-3 px-5 py-5">
          <div>
            <div className="text-base font-semibold text-foreground">
              {anonymous ? "Anonymous" : data.companyName || "—"}
            </div>
            <div className="text-[12.5px] text-muted-foreground">
              {data.city}, {data.country} · {data.region}
            </div>
          </div>
          {!anonymous && (
            <>
              <p className="text-[13px] leading-relaxed text-foreground/80">
                {data.description}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1 text-[10.5px] font-mono uppercase tracking-[0.18em]">
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary">
                  {data.industry}
                </span>
                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-muted-foreground">
                  since {data.usingSince}
                </span>
                {data.websiteUrl && (
                  <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-muted-foreground">
                    {safeHostname(data.websiteUrl)}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <Label className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-[12.5px] text-foreground/80">
        <input
          type="checkbox"
          checked={Boolean(data.consent)}
          onChange={(e) => onConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-primary"
        />
        <span>
          I'm authorised to submit this team and I agree to the information above being shown on the
          public radar (anonymous pins show only region).
        </span>
      </Label>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

  );
}

function safeHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function CountryCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between bg-transparent font-normal",
            !value && "text-muted-foreground",
          )}
        >
          {value || "Search country…"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country…" />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {countries.map((c) => {
                const select = () => {
                  onChange(c.name);
                  setOpen(false);
                };
                return (
                  <CommandItem
                    key={c.code}
                    value={c.name}
                    onSelect={select}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      select();
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value.toLowerCase() === c.name.toLowerCase() ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {c.name}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

