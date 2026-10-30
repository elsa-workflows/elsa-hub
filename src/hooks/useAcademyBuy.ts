import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  ACADEMY_ALREADY_OWNED,
  handleBuyCourse,
  isAcademyAlreadyOwnedError,
  type AcademyBuyOutcome,
} from "@/lib/academy";
import { ACADEMY_CHECKOUT_FAILED_LINE, isAcademyPaymentSuccess } from "@/lib/academyCopy";

export type AcademyBuyAction = () => void | Promise<AcademyBuyOutcome>;

export type AcademyBuyState = {
  /** Starts checkout once; a signed-out visitor goes to sign in instead. */
  buy: () => Promise<void>;
  /** True while checkout is starting or the browser is on its way to Stripe. */
  buying: boolean;
  /** Checkout said this visitor already owns the Solo Bundle (ACADEMY_ALREADY_OWNED or 409). */
  checkoutSaysOwned: boolean;
  /** The page was opened with ?payment=success: never offer a second Buy in this state. */
  paymentSuccess: boolean;
  signedIn: boolean;
  loginHref: string;
};

/**
 * The one Solo Buy flow, shared by AcademySoloCta and AcademyKitStep.
 *
 * Resolving to ACADEMY_ALREADY_OWNED, or rejecting with checkout's 409 already_owned, sets
 * checkoutSaysOwned so the caller shows the owned note. Any other resolution means the browser
 * is on its way to Stripe, so buying stays true to avoid a second checkout session, until a
 * back/forward cache restore (pageshow persisted) resets it. Any other rejection shows the
 * checkout failed toast and re-enables Buy.
 */
export function useAcademyBuy(onBuyCourse: AcademyBuyAction = handleBuyCourse): AcademyBuyState {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const paymentSuccess = isAcademyPaymentSuccess(search);
  const signedIn = Boolean(user);
  const loginHref = `/login?redirect=${encodeURIComponent(`${pathname}${search}`)}`;
  const [checkoutSaysOwned, setCheckoutSaysOwned] = useState(false);
  const [buying, setBuying] = useState(false);
  const buyingRef = useRef(false);
  const setBuyingState = useCallback((value: boolean) => {
    buyingRef.current = value;
    setBuying(value);
  }, []);

  // Back from Stripe can restore this page from the back/forward cache with Buy still disabled.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setBuyingState(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [setBuyingState]);

  const buy = async () => {
    if (!signedIn) {
      navigate(loginHref);
      return;
    }
    if (buyingRef.current) return;
    setBuyingState(true);
    try {
      if ((await onBuyCourse()) === ACADEMY_ALREADY_OWNED) setCheckoutSaysOwned(true);
      // Otherwise the redirect to Stripe has started: keep Buy disabled until the page unloads.
    } catch (error) {
      if (await isAcademyAlreadyOwnedError(error)) setCheckoutSaysOwned(true);
      else {
        toast.error(ACADEMY_CHECKOUT_FAILED_LINE);
        setBuyingState(false);
      }
    }
  };

  return { buy, buying, checkoutSaysOwned, paymentSuccess, signedIn, loginHref };
}
