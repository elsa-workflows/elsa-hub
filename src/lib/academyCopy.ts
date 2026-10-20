import { ELSA_VERSION } from "@/data/elsaVersion";
import {
  ACADEMY_SOLO_LAUNCH_PRICE_EUR,
  ACADEMY_SOLO_LAUNCH_UNTIL_LABEL,
  ACADEMY_SOLO_LAUNCH_VALID_UNTIL,
  ACADEMY_SOLO_REGULAR_PRICE_EUR,
} from "./academyLegal";

const AMSTERDAM_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Amsterdam",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * The launch price runs through the last calendar day in Amsterdam
 * (ACADEMY_SOLO_LAUNCH_VALID_UNTIL, 31 Oct 2026), so it ends at 00:00 CET on
 * 1 Nov, the same moment the Stripe price on the course rows must switch.
 */
export function isAcademySoloLaunchPriceActive(now: Date = new Date()): boolean {
  return AMSTERDAM_DAY.format(now) <= ACADEMY_SOLO_LAUNCH_VALID_UNTIL;
}

/**
 * Single flag for the Gumroad buyer line. Issue #66 (claim flow) imports this
 * and ACADEMY_GUMROAD_CLAIM_LINE and flips the flag there; do not add a second one.
 */
export const ACADEMY_GUMROAD_CLAIM_LIVE = false;

export const ACADEMY_SOLO_HEADING = "Solo Bundle";
export const ACADEMY_SOLO_LOCKED_HEADING = "This lesson is in the Solo Bundle";

export const ACADEMY_SOLO_INCLUDED = [
  "Fundamentals Core: Modules 0-5 with Labs A-C",
  "Fundamentals Complete: Labs D-H",
  "Advanced Patterns: AP0-AP2 with the Approval Lite lab",
] as const;

export const ACADEMY_SOLO_OWNED_NOTE = "You own the Solo Bundle.";
export const ACADEMY_SOLO_OWNED_LINK = "My courses";

export const ACADEMY_SOLO_BUY_LABEL = "Buy the Solo Bundle";
export const ACADEMY_SOLO_SIGN_IN_LABEL = "Sign in to buy";
export const ACADEMY_SOLO_SIGNED_OUT_NOTE = "New here? Creating an Elsa Hub account is free.";

export const ACADEMY_GUMROAD_CLAIM_LINE =
  "Bought on Gumroad? Sign in with the verified email you used there and your access attaches. Bought with a different email? Use the claim code from our email.";

export const ACADEMY_TEAM_LINE_BEFORE = "Buying for a team? Team packs are on the ";
export const ACADEMY_TEAM_LINE_LINK = "Training page";
export const ACADEMY_TEAM_LINE_AFTER = ".";
export const ACADEMY_TEAM_LINE = `${ACADEMY_TEAM_LINE_BEFORE}${ACADEMY_TEAM_LINE_LINK}${ACADEMY_TEAM_LINE_AFTER}`;

export const ACADEMY_PAYMENT_SUCCESS_LINE =
  "You're in. Start with the first lesson, or download the lab kit and unzip it.";

const SOLO_BODY_LEAD = `Every self-paced course in the Academy, with the Elsa ${ELSA_VERSION} lab kit to download and unzip.`;

export function academySoloBundleBody(
  launchActive: boolean = isAcademySoloLaunchPriceActive(),
): string {
  if (launchActive) {
    return `${SOLO_BODY_LEAD} €${ACADEMY_SOLO_LAUNCH_PRICE_EUR} incl. VAT at launch until ${ACADEMY_SOLO_LAUNCH_UNTIL_LABEL}, then €${ACADEMY_SOLO_REGULAR_PRICE_EUR} incl. VAT.`;
  }
  return `${SOLO_BODY_LEAD} €${ACADEMY_SOLO_REGULAR_PRICE_EUR} incl. VAT.`;
}

export function isAcademyPaymentSuccess(search: string): boolean {
  const query = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(query).get("payment") === "success";
}
