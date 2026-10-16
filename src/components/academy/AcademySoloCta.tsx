import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { ACADEMY_TEAM_LICENCES_URL, handleBuyCourse } from "@/lib/academy";
import {
  ACADEMY_GUMROAD_CLAIM_LINE,
  ACADEMY_GUMROAD_CLAIM_LIVE,
  ACADEMY_PAYMENT_SUCCESS_LINE,
  ACADEMY_SOLO_BUY_LABEL,
  ACADEMY_SOLO_HEADING,
  ACADEMY_SOLO_INCLUDED,
  ACADEMY_SOLO_LOCKED_HEADING,
  ACADEMY_SOLO_SIGN_IN_LABEL,
  ACADEMY_SOLO_SIGNED_OUT_NOTE,
  ACADEMY_TEAM_LINE_AFTER,
  ACADEMY_TEAM_LINE_BEFORE,
  ACADEMY_TEAM_LINE_LINK,
  academySoloBundleBody,
  isAcademyPaymentSuccess,
} from "@/lib/academyCopy";

type AcademySoloCtaProps = {
  id?: string;
  locked?: boolean;
  onBuyCourse?: typeof handleBuyCourse;
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

        {!paymentSuccess &&
          (signedIn ? (
            <Button type="button" onClick={() => onBuyCourse()}>
              {ACADEMY_SOLO_BUY_LABEL}
            </Button>
          ) : (
            <div className="space-y-2">
              <Button asChild>
                <Link to={loginHref}>{ACADEMY_SOLO_SIGN_IN_LABEL}</Link>
              </Button>
              <p className="text-sm text-muted-foreground">{ACADEMY_SOLO_SIGNED_OUT_NOTE}</p>
            </div>
          ))}

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
