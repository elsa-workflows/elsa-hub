export const FUNDAMENTALS_CORE_GUMROAD_URL =
  "https://9868397950180.gumroad.com/l/pkvdly";

export type TrainingInterestIntent = "notify" | "quote" | "provider";
export type TrainingQuoteVariant = "workshop" | "seat_quote";

export type SeatInterest = "public" | "private" | "both" | "self_paced";
export type PreferredLength = "half_day" | "one_day" | "either";
export type DeliveryMode = "remote" | "on_site" | "either";
export type TrainingLeadStatus = "new" | "contacted" | "closed";

export const SEAT_QUOTE_NOTES_MARKER = "[25+ seat quote]";
export const SEAT_QUOTE_NOTES_MAX_LENGTH = 4983;
export const SEAT_QUOTE_HEADCOUNT_MIN = 25;
export const SEAT_QUOTE_HEADCOUNT_MAX = 500;

export const TRAINING_INTENTS: TrainingInterestIntent[] = ["notify", "quote", "provider"];

export const intentLabels: Record<TrainingInterestIntent, string> = {
  notify: "Notify me",
  quote: "Private quote",
  provider: "Provider listing",
};

export const dialogCopy: Record<
  TrainingInterestIntent,
  { title: string; description: string; buttonText: string; successMessage: string }
> = {
  notify: {
    title: "Get Fundamentals Core",
    description:
      "Leave your details and we’ll follow up about self-paced Elsa Workflows Fundamentals Core: Modules 0-5, a lab kit you download and unzip, and Labs A-C.",
    buttonText: "Get Fundamentals Core",
    successMessage: "Thanks. We’ll follow up about Fundamentals Core.",
  },
  quote: {
    title: "Request a private team workshop",
    description:
      "Share team size and delivery preferences and we’ll follow up with a private-workshop quote for Elsa Workflows Fundamentals for Teams.",
    buttonText: "Request a quote",
    successMessage: "Thanks. We’ll follow up about a private team workshop quote.",
  },
  provider: {
    title: "Offer Elsa Workflows training?",
    description:
      "Listing is not automatic. Tell us about your organisation and offerings and we’ll be in touch.",
    buttonText: "Get in touch",
    successMessage: "Thanks for your interest. We’ll reach out about training provider opportunities.",
  },
};

export const quoteDialogCopy: Record<
  TrainingQuoteVariant,
  { title: string; description: string; buttonText: string; successMessage: string }
> = {
  workshop: dialogCopy.quote,
  seat_quote: {
    title: "Request a 25+ seat quote",
    description:
      "Share team size and how many seats you need. We will follow up with a Team pack quote for 25 or more people on Elsa 3.9.0.",
    buttonText: "Request a quote",
    successMessage: "Thanks. We will follow up about a 25+ seat Team pack quote.",
  },
};

export function applySeatQuoteNotesMarker(notes: string): string {
  const trimmed = notes.trim();
  if (!trimmed) return SEAT_QUOTE_NOTES_MARKER;
  if (trimmed.startsWith(SEAT_QUOTE_NOTES_MARKER)) return trimmed;
  return `${SEAT_QUOTE_NOTES_MARKER} ${trimmed}`;
}

export const roleOptions = [
  { value: "developer", label: "Developer" },
  { value: "tech_lead", label: "Tech lead" },
  { value: "architect", label: "Architect" },
  { value: "engineering_manager", label: "Engineering manager" },
  { value: "platform", label: "Platform / DevOps" },
  { value: "other", label: "Other" },
] as const;

export const companySizeOptions = [
  { value: "1-10", label: "1-10" },
  { value: "11-50", label: "11-50" },
  { value: "51-200", label: "51-200" },
  { value: "201-1000", label: "201-1,000" },
  { value: "1000+", label: "1,000+" },
] as const;

export const seatInterestOptions = [
  { value: "self_paced" as const, label: "Self-paced (Solo Bundle)" },
  { value: "private" as const, label: "Private team workshop" },
  { value: "both" as const, label: "Both" },
];

export const seatInterestLabels: Record<SeatInterest, string> = {
  self_paced: "Self-paced (Solo Bundle)",
  public: "Public seats",
  private: "Private team workshop",
  both: "Both",
};

export const preferredLengthOptions = [
  { value: "half_day" as const, label: "Half-day" },
  { value: "one_day" as const, label: "One-day" },
  { value: "either" as const, label: "Either / not sure" },
];

export const deliveryOptions = [
  { value: "remote" as const, label: "Remote" },
  { value: "on_site" as const, label: "On-site" },
  { value: "either" as const, label: "Either" },
];

export const regionOptions = [
  "Europe",
  "North America",
  "South America",
  "Asia",
  "Africa",
  "Oceania",
] as const;

export const languageOptions = [
  "English",
  "Dutch",
  "German",
  "French",
  "Spanish",
  "Other",
] as const;

export const offeringOptions = [
  { value: "public_workshop", label: "Public workshops" },
  { value: "private_workshop", label: "Private workshops" },
  { value: "course", label: "Courses" },
  { value: "self_paced", label: "Self-paced" },
  { value: "certification", label: "Certifications" },
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HTTP_URL_RE = /^https?:\/\/[^\s]+$/i;

export interface TrainingInterestForm {
  email: string;
  contactName: string;
  role: string;
  company: string;
  companySize: string;
  interest: "" | SeatInterest;
  preferredLength: "" | PreferredLength;
  startMonth: string;
  headcount: string;
  delivery: "" | DeliveryMode;
  timezoneRegion: string;
  notes: string;
  organizationName: string;
  website: string;
  regions: string[];
  languages: string[];
  offerings: string[];
  experience: string;
  outlineUrl: string;
  honeypot: string;
}

export function emptyTrainingInterestForm(): TrainingInterestForm {
  return {
    email: "",
    contactName: "",
    role: "",
    company: "",
    companySize: "",
    interest: "",
    preferredLength: "",
    startMonth: "",
    headcount: "",
    delivery: "",
    timezoneRegion: "",
    notes: "",
    organizationName: "",
    website: "",
    regions: [],
    languages: [],
    offerings: [],
    experience: "",
    outlineUrl: "",
    honeypot: "",
  };
}

export function startMonthOptions(now: Date = new Date()): { value: string; label: string }[] {
  const months: { value: string; label: string }[] = [
    { value: "flexible", label: "Flexible / not sure" },
  ];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", { month: "long", year: "numeric" });
    months.push({ value, label });
  }
  return months;
}

function trim(value: string): string {
  return value.trim();
}

function optional(value: string): string | null {
  const t = trim(value);
  return t ? t : null;
}

function isValidEmail(value: string): boolean {
  const email = trim(value);
  return email.length >= 3 && email.length <= 320 && EMAIL_RE.test(email);
}

function isValidOptionalUrl(value: string): boolean {
  const t = trim(value);
  if (!t) return true;
  if (t.length > 500) return false;
  try {
    const url = new URL(t);
    return (url.protocol === "http:" || url.protocol === "https:") && HTTP_URL_RE.test(t);
  } catch {
    return false;
  }
}

export function parseHeadcount(
  value: string,
  range: { min?: number; max?: number } = {},
): number | null {
  const min = range.min ?? 1;
  const max = range.max ?? 500;
  const t = trim(value);
  if (!t) return null;
  const n = Number(t);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

/** Notify-me and public-seat interest stay on the existing MailerLite list. */
export function shouldSubscribeToNewsletter(
  intent: TrainingInterestIntent,
  form: Pick<TrainingInterestForm, "interest">,
  extras: { quoteVariant?: TrainingQuoteVariant } = {},
): boolean {
  if (extras.quoteVariant === "seat_quote") return false;
  if (intent === "notify") return true;
  if (
    intent === "quote" &&
    (form.interest === "public" || form.interest === "both" || form.interest === "self_paced")
  ) {
    return true;
  }
  return false;
}

export interface TrainingLeadInsert {
  intent: TrainingInterestIntent;
  email: string;
  contact_name: string | null;
  role: string | null;
  company: string | null;
  company_size: string | null;
  interest: string | null;
  preferred_length: string | null;
  start_month: string | null;
  headcount: number | null;
  delivery: string | null;
  timezone_region: string | null;
  notes: string | null;
  organization_name: string | null;
  website: string | null;
  regions: string[] | null;
  languages: string[] | null;
  offerings: string[] | null;
  experience: string | null;
  outline_url: string | null;
  source_page: string;
  user_id: string | null;
}

export type TrainingInterestValidation =
  | { ok: true; insert: TrainingLeadInsert; subscribe: boolean }
  | { ok: false; error: string };

export function validateTrainingInterest(
  intent: TrainingInterestIntent,
  form: TrainingInterestForm,
  extras: {
    sourcePage?: string;
    userId?: string | null;
    quoteVariant?: TrainingQuoteVariant;
  } = {},
): TrainingInterestValidation {
  if (!TRAINING_INTENTS.includes(intent)) {
    return { ok: false, error: "Unknown request type." };
  }

  if (!isValidEmail(form.email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  if (intent === "provider") {
    if (!trim(form.organizationName)) {
      return { ok: false, error: "Please enter your organisation name." };
    }
    if (!trim(form.contactName)) {
      return { ok: false, error: "Please enter a contact name." };
    }
    if (form.regions.length === 0) {
      return { ok: false, error: "Please select at least one region." };
    }
    if (form.languages.length === 0) {
      return { ok: false, error: "Please select at least one language." };
    }
    if (form.offerings.length === 0) {
      return { ok: false, error: "Please select at least one offering." };
    }
    if (!trim(form.experience)) {
      return { ok: false, error: "Please describe your training experience." };
    }
    if (!isValidOptionalUrl(form.website) || !isValidOptionalUrl(form.outlineUrl)) {
      return { ok: false, error: "Please enter a valid http(s) URL." };
    }
  }

  const isSeatQuote = intent === "quote" && extras.quoteVariant === "seat_quote";

  if (intent === "quote") {
    const headcount = parseHeadcount(
      form.headcount,
      isSeatQuote
        ? { min: SEAT_QUOTE_HEADCOUNT_MIN, max: SEAT_QUOTE_HEADCOUNT_MAX }
        : undefined,
    );
    if (headcount === null) {
      return {
        ok: false,
        error: isSeatQuote
          ? "Please enter how many seats you need (25-500)."
          : "Please enter how many people will attend (1-500).",
      };
    }
    if (!isValidOptionalUrl(form.website) || !isValidOptionalUrl(form.outlineUrl)) {
      return { ok: false, error: "Please enter a valid http(s) URL." };
    }
  }

  if (intent === "notify" && (!isValidOptionalUrl(form.website) || !isValidOptionalUrl(form.outlineUrl))) {
    return { ok: false, error: "Please enter a valid http(s) URL." };
  }

  const insert: TrainingLeadInsert = {
    intent,
    email: trim(form.email).toLowerCase(),
    contact_name: optional(form.contactName),
    role: optional(form.role),
    company: optional(form.company),
    company_size: optional(form.companySize),
    interest: optional(form.interest),
    preferred_length: optional(form.preferredLength),
    start_month: optional(form.startMonth),
    headcount: parseHeadcount(
      form.headcount,
      isSeatQuote
        ? { min: SEAT_QUOTE_HEADCOUNT_MIN, max: SEAT_QUOTE_HEADCOUNT_MAX }
        : undefined,
    ),
    delivery: optional(form.delivery),
    timezone_region: optional(form.timezoneRegion),
    notes: optional(form.notes),
    organization_name: optional(form.organizationName),
    website: optional(form.website),
    regions: form.regions.length ? form.regions : null,
    languages: form.languages.length ? form.languages : null,
    offerings: form.offerings.length ? form.offerings : null,
    experience: optional(form.experience),
    outline_url: optional(form.outlineUrl),
    source_page: extras.sourcePage ?? "/elsa-plus/training",
    user_id: extras.userId ?? null,
  };

  return {
    ok: true,
    insert,
    subscribe: shouldSubscribeToNewsletter(intent, form, {
      quoteVariant: extras.quoteVariant,
    }),
  };
}

export function toggleListValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}
