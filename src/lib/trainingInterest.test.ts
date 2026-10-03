import { describe, expect, it } from "vitest";
import {
  applySeatQuoteNotesMarker,
  companySizeOptions,
  dialogCopy,
  emptyTrainingInterestForm,
  FUNDAMENTALS_CORE_GUMROAD_URL,
  parseHeadcount,
  quoteDialogCopy,
  SEAT_QUOTE_NOTES_MARKER,
  shouldSubscribeToNewsletter,
  startMonthOptions,
  toggleListValue,
  validateTrainingInterest,
  type TrainingInterestForm,
} from "./trainingInterest";

describe("Gumroad product URLs", () => {
  it("points at the live Gumroad Solo Bundle product", () => {
    expect(FUNDAMENTALS_CORE_GUMROAD_URL).toBe("https://9868397950180.gumroad.com/l/pkvdly");
  });
});

function notifyForm(overrides: Partial<TrainingInterestForm> = {}): TrainingInterestForm {
  return {
    ...emptyTrainingInterestForm(),
    email: "jane@acme.com",
    contactName: "Jane Doe",
    role: "tech_lead",
    company: "Acme",
    companySize: "51-200",
    interest: "self_paced",
    preferredLength: "half_day",
    startMonth: "2026-10",
    ...overrides,
  };
}

function quoteForm(overrides: Partial<TrainingInterestForm> = {}): TrainingInterestForm {
  return notifyForm({
    interest: "private",
    headcount: "8",
    delivery: "remote",
    timezoneRegion: "Europe",
    notes: "Prefer October",
    ...overrides,
  });
}

function providerForm(overrides: Partial<TrainingInterestForm> = {}): TrainingInterestForm {
  return {
    ...emptyTrainingInterestForm(),
    email: "training@partner.com",
    contactName: "Alex Partner",
    organizationName: "Partner Academy",
    website: "https://partner.example",
    regions: ["Europe"],
    languages: ["English", "Dutch"],
    offerings: ["private_workshop"],
    experience: "Five years delivering .NET workshops.",
    outlineUrl: "https://partner.example/elsa-outline",
    notes: "Happy to co-brand.",
    ...overrides,
  };
}

describe("startMonthOptions", () => {
  it("starts with flexible and then the next 12 calendar months", () => {
    const options = startMonthOptions(new Date(2026, 8, 14));
    expect(options[0]).toEqual({ value: "flexible", label: "Flexible / not sure" });
    expect(options).toHaveLength(13);
    expect(options[1]).toEqual({ value: "2026-09", label: "September 2026" });
    expect(options[12]).toEqual({ value: "2027-08", label: "August 2027" });
  });
});

describe("parseHeadcount", () => {
  it("accepts integers from 1 to 500", () => {
    expect(parseHeadcount("12")).toBe(12);
    expect(parseHeadcount("")).toBeNull();
    expect(parseHeadcount("0")).toBeNull();
    expect(parseHeadcount("501")).toBeNull();
    expect(parseHeadcount("8.5")).toBeNull();
  });
});

describe("shouldSubscribeToNewsletter", () => {
  it("subscribes notify-me and public-seat quotes, not private-only or providers", () => {
    expect(shouldSubscribeToNewsletter("notify", { interest: "" })).toBe(true);
    expect(shouldSubscribeToNewsletter("quote", { interest: "public" })).toBe(true);
    expect(shouldSubscribeToNewsletter("quote", { interest: "both" })).toBe(true);
    expect(shouldSubscribeToNewsletter("quote", { interest: "self_paced" })).toBe(true);
    expect(shouldSubscribeToNewsletter("quote", { interest: "private" })).toBe(false);
    expect(shouldSubscribeToNewsletter("provider", { interest: "" })).toBe(false);
    expect(
      shouldSubscribeToNewsletter("quote", { interest: "" }, { quoteVariant: "seat_quote" }),
    ).toBe(false);
    expect(
      shouldSubscribeToNewsletter(
        "quote",
        { interest: "self_paced" },
        { quoteVariant: "seat_quote" },
      ),
    ).toBe(false);
  });
});

describe("validateTrainingInterest", () => {
  it("requires a valid email for every intent", () => {
    const result = validateTrainingInterest("notify", notifyForm({ email: "not-an-email" }));
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.error).toMatch(/valid email/i);
  });

  it("maps a notify payload and marks it for MailerLite", () => {
    const result = validateTrainingInterest("notify", notifyForm(), {
      sourcePage: "/elsa-plus/training",
      userId: "user-1",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.subscribe).toBe(true);
    expect(result.insert).toMatchObject({
      intent: "notify",
      email: "jane@acme.com",
      contact_name: "Jane Doe",
      role: "tech_lead",
      company: "Acme",
      company_size: "51-200",
      interest: "self_paced",
      preferred_length: "half_day",
      start_month: "2026-10",
      headcount: null,
      source_page: "/elsa-plus/training",
      user_id: "user-1",
    });
  });

  it("requires headcount on private quotes", () => {
    const missing = validateTrainingInterest("quote", quoteForm({ headcount: "" }));
    expect(missing.ok).toBe(false);
    if (missing.ok === false) expect(missing.error).toMatch(/how many people/i);

    const ok = validateTrainingInterest("quote", quoteForm());
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.subscribe).toBe(false);
    expect(ok.insert.headcount).toBe(8);
    expect(ok.insert.delivery).toBe("remote");
    expect(ok.insert.timezone_region).toBe("Europe");
  });

  it("requires provider org, contact, regions, languages, offerings, and experience", () => {
    expect(validateTrainingInterest("provider", providerForm({ organizationName: "" })).ok).toBe(false);
    expect(validateTrainingInterest("provider", providerForm({ contactName: "" })).ok).toBe(false);
    expect(validateTrainingInterest("provider", providerForm({ regions: [] })).ok).toBe(false);
    expect(validateTrainingInterest("provider", providerForm({ languages: [] })).ok).toBe(false);
    expect(validateTrainingInterest("provider", providerForm({ offerings: [] })).ok).toBe(false);
    expect(validateTrainingInterest("provider", providerForm({ experience: "" })).ok).toBe(false);

    const ok = validateTrainingInterest("provider", providerForm());
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.subscribe).toBe(false);
    expect(ok.insert.organization_name).toBe("Partner Academy");
    expect(ok.insert.regions).toEqual(["Europe"]);
    expect(ok.insert.languages).toEqual(["English", "Dutch"]);
    expect(ok.insert.offerings).toEqual(["private_workshop"]);
    expect(ok.insert.outline_url).toBe("https://partner.example/elsa-outline");
  });

  it("rejects non-http outline URLs", () => {
    const result = validateTrainingInterest(
      "provider",
      providerForm({ outlineUrl: "javascript:alert(1)" }),
    );
    expect(result.ok).toBe(false);
  });
});

describe("toggleListValue", () => {
  it("adds and removes values", () => {
    expect(toggleListValue(["Europe"], "Asia")).toEqual(["Europe", "Asia"]);
    expect(toggleListValue(["Europe", "Asia"], "Europe")).toEqual(["Asia"]);
  });
});

describe("seat-quote lead distinction", () => {
  it("prepends the 25+ seat quote marker on notes at submit time", () => {
    expect(applySeatQuoteNotesMarker("")).toBe(SEAT_QUOTE_NOTES_MARKER);
    expect(applySeatQuoteNotesMarker("  ")).toBe(SEAT_QUOTE_NOTES_MARKER);
    expect(applySeatQuoteNotesMarker("Need 40 seats")).toBe(
      `${SEAT_QUOTE_NOTES_MARKER} Need 40 seats`,
    );
    expect(applySeatQuoteNotesMarker(`${SEAT_QUOTE_NOTES_MARKER} Need 40 seats`)).toBe(
      `${SEAT_QUOTE_NOTES_MARKER} Need 40 seats`,
    );
  });

  it("stores quote intent with the seat-quote marker in notes and does not subscribe", () => {
    const markedNotes = applySeatQuoteNotesMarker("Need 40 seats in Q4");
    const result = validateTrainingInterest(
      "quote",
      quoteForm({ interest: "", headcount: "40", notes: markedNotes }),
      { quoteVariant: "seat_quote" },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.subscribe).toBe(false);
    expect(result.insert.intent).toBe("quote");
    expect(result.insert.notes).toBe("[25+ seat quote] Need 40 seats in Q4");
  });

  it("requires 25 to 500 seats on seat quotes", () => {
    const tooFew = validateTrainingInterest(
      "quote",
      quoteForm({ interest: "", headcount: "8" }),
      { quoteVariant: "seat_quote" },
    );
    expect(tooFew.ok).toBe(false);
    if (tooFew.ok === false) expect(tooFew.error).toMatch(/seats you need \(25-500\)/i);
  });

  it("describes the Solo Bundle seat-quote dialog without old Core pricing copy", () => {
    const copy = quoteDialogCopy.seat_quote;
    const joined = `${copy.title} ${copy.description} ${copy.buttonText} ${copy.successMessage}`;
    expect(copy.title).toBe("Request a 25+ seat quote");
    expect(joined).toMatch(/25\+ seat/i);
    expect(joined).not.toMatch(/€399/);
    expect(joined).not.toMatch(/Fundamentals Core/);
    expect(joined).not.toContain("\u2014");
    expect(joined).not.toContain("\u2013");
  });
});

describe("training interest dialog copy", () => {
  it("uses download-and-unzip lab kit wording and no em or en dashes", () => {
    expect(dialogCopy.notify.description).toMatch(/a lab kit you download and unzip/);
    expect(dialogCopy.notify.description).not.toMatch(/cloneable/i);

    const copyBlob = [
      ...Object.values(dialogCopy).flatMap((copy) => Object.values(copy)),
      ...Object.values(quoteDialogCopy).flatMap((copy) => Object.values(copy)),
      ...companySizeOptions.map((option) => option.label),
    ].join("\n");
    expect(copyBlob).not.toMatch(/[\u2013\u2014]/);
  });
});
