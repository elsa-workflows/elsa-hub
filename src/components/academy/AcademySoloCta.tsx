import type { ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAcademyBuy, type AcademyBuyAction } from "@/hooks/useAcademyBuy";
import { ACADEMY_MY_COURSES_HASH, ACADEMY_PATH, ACADEMY_TEAM_LICENCES_URL } from "@/lib/academy";
import {
  ACADEMY_GUMROAD_CLAIM_LINE,
  ACADEMY_GUMROAD_CLAIM_LIVE,
  ACADEMY_PAYMENT_PENDING_LINE,
  ACADEMY_PAYMENT_SUCCESS_LINE,
  ACADEMY_SOLO_BUY_LABEL,
  ACADEMY_SOLO_HEADING,
  ACADEMY_SOLO_INCLUDED,
  ACADEMY_SOLO_LOCKED_HEADING,
  ACADEMY_SOLO_LOCKED_SIGN_IN_BEFORE,
  ACADEMY_SOLO_LOCKED_SIGN_IN_LINK,
  ACADEMY_SOLO_OWNED_LINK,
  ACADEMY_SOLO_OWNED_NOTE,
  ACADEMY_SOLO_OWNERSHIP_CHECK_FAILED_LINE,
  ACADEMY_SOLO_SIGN_IN_LABEL,
  ACADEMY_SOLO_SIGNED_OUT_NOTE,
  ACADEMY_TEAM_LINE_AFTER,
  ACADEMY_TEAM_LINE_BEFORE,
  ACADEMY_TEAM_LINE_LINK,
  academySoloBundleBody,
  isAcademyPaymentSuccess,
} from "@/lib/academyCopy";

export type AcademySoloOwnership = "owned" | "unknown" | "failed" | "none";

type AcademySoloCtaProps = {
  id?: string;
  /** Extra classes on the card, e.g. scroll-mt-* when it is an in-page anchor target. */
  className?: string;
  locked?: boolean;
  /**
   * "owned": the visitor's personal grants cover every published course, so show a note instead
   * of a buy action. A team seat or admin access lends access but does not count. "unknown":
   * ownership is still loading, so show neither a buy action nor the note. "failed": ownership
   * could not be checked, so show no buy action and tell a signed-in visitor to refresh.
   * Default "none".
   */
  ownership?: AcademySoloOwnership;
  /**
   * Signed out: show Buy (useAcademyBuy sends the visitor to sign in and back) plus a "Sign in"
   * link for people who already bought, instead of the single "Sign in to buy" button. Used on a
   * locked lesson, where a signed-out visitor arrives straight from a shared lesson link.
   */
  signedOutBuy?: boolean;
  /**
   * Resolving to ACADEMY_ALREADY_OWNED, or rejecting with checkout's 409 already_owned, swaps Buy
   * for the owned note. Any other resolution means the browser is on its way to Stripe, so Buy
   * stays disabled to avoid a second checkout session. Any other rejection shows an error toast
   * and re-enables Buy.
   */
  onBuyCourse?: AcademyBuyAction;
};

export function AcademyPaymentSuccessNote() {
  const [params] = useSearchParams();
  if (!isAcademyPaymentSuccess(params.toString())) return null;
  return (
    <p data-testid="academy-payment-success" className="text-sm text-primary">
      {ACADEMY_PAYMENT_SUCCESS_LINE}
    </p>
  );
}

/** Shown instead of Buy once the visitor is known to own the Solo Bundle. */
export function AcademySoloOwnedNote() {
  return (
    <p className="text-sm">
      {ACADEMY_SOLO_OWNED_NOTE}{" "}
      <Link to={`${ACADEMY_PATH}${ACADEMY_MY_COURSES_HASH}`} className="text-primary hover:underline">
        {ACADEMY_SOLO_OWNED_LINK}
      </Link>
    </p>
  );
}

export function AcademySoloCta({
  id,
  className,
  locked = false,
  ownership = "none",
  signedOutBuy = false,
  onBuyCourse,
}: AcademySoloCtaProps) {
  const { buy, buying, checkoutSaysOwned, paymentSuccess, signedIn, loginHref } =
    useAcademyBuy(onBuyCourse);
  const showIncluded = !locked;
  const showGumroadClaim = locked && signedIn && ACADEMY_GUMROAD_CLAIM_LIVE;

  let purchaseArea: ReactNode = null;
  if (ownership === "owned" || checkoutSaysOwned) {
    purchaseArea = <AcademySoloOwnedNote />;
  } else if (ownership === "failed" && signedIn) {
    purchaseArea = (
      <p className="text-sm text-muted-foreground">{ACADEMY_SOLO_OWNERSHIP_CHECK_FAILED_LINE}</p>
    );
  } else if (ownership === "none" && !signedIn && signedOutBuy) {
    purchaseArea = (
      <div className="space-y-2">
        {!paymentSuccess && (
          <Button type="button" onClick={buy} disabled={buying} aria-busy={buying}>
            {ACADEMY_SOLO_BUY_LABEL}
          </Button>
        )}
        <p className="text-sm text-muted-foreground">
          {ACADEMY_SOLO_LOCKED_SIGN_IN_BEFORE}
          <Link to={loginHref} className="text-primary hover:underline">
            {ACADEMY_SOLO_LOCKED_SIGN_IN_LINK}
          </Link>
        </p>
        {!paymentSuccess && (
          <p className="text-sm text-muted-foreground">{ACADEMY_SOLO_SIGNED_OUT_NOTE}</p>
        )}
      </div>
    );
  } else if (ownership === "none" && !signedIn) {
    // A buyer back from Stripe signed out sees the pending line, so give them a way to sign in.
    purchaseArea = (
      <div className="space-y-2">
        <Button asChild>
          <Link to={loginHref}>{ACADEMY_SOLO_SIGN_IN_LABEL}</Link>
        </Button>
        {!paymentSuccess && (
          <p className="text-sm text-muted-foreground">{ACADEMY_SOLO_SIGNED_OUT_NOTE}</p>
        )}
      </div>
    );
  } else if (ownership === "none" && !paymentSuccess) {
    purchaseArea = (
      <Button type="button" onClick={buy} disabled={buying} aria-busy={buying}>
        {ACADEMY_SOLO_BUY_LABEL}
      </Button>
    );
  }

  return (
    <Card id={id} className={className} data-testid="academy-solo-cta">
      <CardHeader>
        <CardTitle>{locked ? ACADEMY_SOLO_LOCKED_HEADING : ACADEMY_SOLO_HEADING}</CardTitle>
        <CardDescription>{academySoloBundleBody()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {paymentSuccess && (ownership === "owned" || checkoutSaysOwned) && <AcademyPaymentSuccessNote />}
        {paymentSuccess && ownership !== "owned" && !checkoutSaysOwned && (
          <p data-testid="academy-payment-pending" className="text-sm text-muted-foreground">
            {ACADEMY_PAYMENT_PENDING_LINE}
          </p>
        )}

        {showIncluded && (
          <ul className="list-disc pl-5 text-sm space-y-1">
            {ACADEMY_SOLO_INCLUDED.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}

        {purchaseArea}

        {showGumroadClaim && (
          <p className="text-sm text-muted-foreground">{ACADEMY_GUMROAD_CLAIM_LINE}</p>
        )}

        <p className="text-sm text-muted-foreground">
          {ACADEMY_TEAM_LINE_BEFORE}
          <Link to={ACADEMY_TEAM_LICENCES_URL} className="text-primary hover:underline">
            {ACADEMY_TEAM_LINE_LINK}
          </Link>
          {ACADEMY_TEAM_LINE_AFTER}
        </p>
      </CardContent>
    </Card>
  );
}
