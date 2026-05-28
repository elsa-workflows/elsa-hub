import { useState } from "react";
import { z } from "zod";
import { Check, ChevronLeft, ChevronRight, Globe2, MapPin, Sparkles, Send } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { elsaIndustries, elsaRegions } from "@/data/elsaUsageLocations";

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
    if (!validateStep(3)) return;
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
        title: "Submission received",
        description:
          "Thanks — your team is in the review queue and will appear on the radar once approved.",
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
      <DialogContent className="max-w-2xl border-cyan-400/20 bg-[#03060f] p-0 text-cyan-50">
        <DialogHeader className="border-b border-white/5 px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-cyan-50">
            <StepIcon className="h-4 w-4 text-cyan-300" />
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
                      <Input
                        value={data.country ?? ""}
                        maxLength={80}
                        onChange={(e) => set("country", e.target.value)}
                        placeholder="Netherlands"
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
                      />
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

        <div className="flex items-center justify-between border-t border-white/5 px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={back}
            disabled={step === 0 || submitting}
            className="text-cyan-200/70 hover:text-cyan-50"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          {step < steps.length - 1 ? (
            <Button
              type="button"
              onClick={next}
              className="bg-cyan-400/90 text-[#03060f] hover:bg-cyan-300"
            >
              Continue
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
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
                done && "border-cyan-400 bg-cyan-400/20 text-cyan-100",
                active && "border-primary bg-primary/20 text-primary-foreground",
                !done && !active && "border-white/10 text-cyan-200/40",
              )}
            >
              {done ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span
              className={cn(
                "hidden font-mono text-[10px] uppercase tracking-[0.18em] sm:inline",
                active ? "text-primary-foreground" : "text-cyan-200/40",
              )}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <span
                className={cn(
                  "h-px flex-1",
                  done ? "bg-cyan-400/50" : "bg-white/10",
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
      <Label className="text-[12px] font-medium text-cyan-100/80">
        {label}
        {required && <span className="ml-1 text-primary-foreground">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-[11px] text-rose-300">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-cyan-200/40">{hint}</p>
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
      className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 transition-colors hover:border-cyan-400/40 [&:has(:checked)]:border-primary/60 [&:has(:checked)]:bg-primary/10"
    >
      <RadioGroupItem id={`vis-${value}`} value={value} className="mt-0.5" />
      <div>
        <div className="text-[13px] font-medium text-cyan-50">{title}</div>
        <div className="text-[11.5px] text-cyan-200/60">{description}</div>
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
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300/70">
        Preview · how it will appear
      </div>
      <div className="overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#040814]">
        <div className="border-b border-white/5 px-5 py-3 text-[11px] font-mono uppercase tracking-[0.2em] text-cyan-200/60">
          {anonymous ? "Anonymous signal" : "Showcase deployment"}
        </div>
        <div className="space-y-3 px-5 py-5">
          <div>
            <div className="text-base font-semibold text-cyan-50">
              {anonymous ? "Anonymous" : data.companyName || "—"}
            </div>
            <div className="text-[12.5px] text-cyan-200/60">
              {data.city}, {data.country} · {data.region}
            </div>
          </div>
          {!anonymous && (
            <>
              <p className="text-[13px] leading-relaxed text-cyan-100/80">
                {data.description}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1 text-[10.5px] font-mono uppercase tracking-[0.18em]">
                <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-cyan-200">
                  {data.industry}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-cyan-200/70">
                  since {data.usingSince}
                </span>
                {data.websiteUrl && (
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-cyan-200/70">
                    {safeHostname(data.websiteUrl)}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <Label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-[12.5px] text-cyan-100/80">
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
      {error && <p className="text-[11px] text-rose-300">{error}</p>}
    </div>
  );
}

function safeHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
