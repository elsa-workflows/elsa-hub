import { useState, type ReactNode } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import {
  ACADEMY_ALREADY_OWNED,
  ACADEMY_TEAM_LICENCES_URL,
  handleBuyCourse,
  isAcademyAlreadyOwnedError,
  type AcademyBuyOutcome,
} from "@/lib/academy";
import {
  ACADEMY_CHECKOUT_FAILED_LINE,
  ACADEMY_GUMROAD_CLAIM_LINE,
  ACADEMY_GUMROAD_CLAIM_LIVE,
  ACADEMY_PAYMENT_SUCCESS_LINE,
  ACADEMY_SOLO_BUY_LABEL,
  ACADEMY_SOLO_HEADING,
  ACADEMY_SOLO_INCLUDED,
  ACADEMY_SOLO_LOCKED_HEADING,
  ACADEMY_SOLO_OWNED_LINK,
  ACADEMY_SOLO_OWNED_NOTE,
  ACADEMY_SOLO_SIGN_IN_LABEL,
  ACADEMY_SOLO_SIGNED_OUT_NOTE,
  ACADEMY_TEAM_LINE_AFTER,
  ACADEMY_TEAM_LINE_BEFORE,
  ACADEMY_TEAM_LINE_LINK,
  academySoloBundleBody,
  isAcademyPaymentSuccess,
} from "@/lib/academyCopy";

export type AcademySoloOwnership = "owned" | "unknown" | "none";

type AcademySoloCtaProps = {
  id?: string;
  locked?: boolean;
  /**
   * "owned": the visitor has access to every published bundle course, so show a note instead
   * of a buy action. "unknown": ownership is still loading or failed to load, so show neither
   * a buy action nor the note. Default "none".
   */
  ownership?: AcademySoloOwnership;
  /**
   * Resolving to ACADEMY_ALREADY_OWNED, or rejecting with checkout's 409 already_owned, swaps Buy
   * for the owned note. Any other rejection shows an error toast and re-enables Buy.
   */
  onBuyCourse?: () => void | Promise<AcademyBuyOutcome>;
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

export function AcademySoloCta({
  id,
  locked = false,
  ownership = "none",
  onBuyCourse = handleBuyCourse,
}: AcademySoloCtaProps) {
  const { user } = useAuth();
  const { pathname, search } = useLocation();
  const [params] = useSearchParams();
  const paymentSuccess = isAcademyPaymentSuccess(params.toString());
  const signedIn = Boolean(user);
  const showIncluded = !locked;
  const showGumroadClaim = locked && signedIn && ACADEMY_GUMROAD_CLAIM_LIVE;
  const loginHref = `/login?redirect=${encodeURIComponent(`${pathname}${search}`)}`;
  const [checkoutSaysOwned, setCheckoutSaysOwned] = useState(false);
  const [buying, setBuying] = useState(false);
  const buy = async () => {
    setBuying(true);
    try {
      if ((await onBuyCourse()) === ACADEMY_ALREADY_OWNED) setCheckoutSaysOwned(true);
    } catch (error) {
      if (await isAcademyAlreadyOwnedError(error)) setCheckoutSaysOwned(true);
      else toast.error(ACADEMY_CHECKOUT_FAILED_LINE);
    } finally {
      setBuying(false);
    }
  };

  let purchaseArea: ReactNode = null;
  if (ownership === "owned" || checkoutSaysOwned) {
    purchaseArea = (
      <p className="text-sm">
        {ACADEMY_SOLO_OWNED_NOTE}{" "}
        <a href="#my-courses" className="text-primary hover:underline">
          {ACADEMY_SOLO_OWNED_LINK}
        </a>
      </p>
    );
  } else if (ownership === "none" && !paymentSuccess) {
    purchaseArea = signedIn ? (
      <Button type="button" onClick={buy} disabled={buying}>
        {ACADEMY_SOLO_BUY_LABEL}
      </Button>
    ) : (
      <div className="space-y-2">
        <Button asChild>
          <Link to={loginHref}>{ACADEMY_SOLO_SIGN_IN_LABEL}</Link>
        </Button>
        <p className="text-sm text-muted-foreground">{ACADEMY_SOLO_SIGNED_OUT_NOTE}</p>
      </div>
    );
  }

  return (
    <Card id={id} data-testid="academy-solo-cta">
      <CardHeader>
        <CardTitle>{locked ? ACADEMY_SOLO_LOCKED_HEADING : ACADEMY_SOLO_HEADING}</CardTitle>
        <CardDescription>{academySoloBundleBody()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {paymentSuccess && <AcademyPaymentSuccessNote />}

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
