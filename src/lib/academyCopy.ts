/** Set to false on 1 Nov 2026 to drop the launch-price sentence. */
export const ACADEMY_SOLO_LAUNCH_PRICE_ACTIVE = true;

export const ACADEMY_SOLO_LAUNCH_PRICE_EUR = 29;
export const ACADEMY_SOLO_POST_LAUNCH_PRICE_EUR = 39;
export const ACADEMY_SOLO_LAUNCH_UNTIL_LABEL = "31 Oct";

export const ACADEMY_GUMROAD_CLAIM_LIVE = false;

export const ACADEMY_SOLO_HEADING = "Solo Bundle";
export const ACADEMY_SOLO_LOCKED_HEADING = "This lesson is in the Solo Bundle";

export const ACADEMY_SOLO_INCLUDED = [
  "Fundamentals Core: Modules 0-5 with Labs A-C",
  "Fundamentals Complete: Labs D-H",
  "Advanced Patterns: AP0-AP2 with the Approval Lite lab",
] as const;

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

const SOLO_BODY_LEAD =
  "Every self-paced course in the Academy, with the Elsa 3.9.0 lab kit to download and unzip.";

export function academySoloBundleBody(
  launchActive: boolean = ACADEMY_SOLO_LAUNCH_PRICE_ACTIVE,
): string {
  if (launchActive) {
    return `${SOLO_BODY_LEAD} €${ACADEMY_SOLO_LAUNCH_PRICE_EUR} until ${ACADEMY_SOLO_LAUNCH_UNTIL_LABEL}, then €${ACADEMY_SOLO_POST_LAUNCH_PRICE_EUR}. EUR excl. VAT.`;
  }
  return `${SOLO_BODY_LEAD} €${ACADEMY_SOLO_POST_LAUNCH_PRICE_EUR}. EUR excl. VAT.`;
}

export function isAcademyPaymentSuccess(search: string): boolean {
  const query = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(query).get("payment") === "success";
}
