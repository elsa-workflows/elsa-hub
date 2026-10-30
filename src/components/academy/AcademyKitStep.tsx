import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AcademyKitDownload } from "@/components/academy/AcademyKitDownload";
import { useAuth } from "@/contexts/AuthContext";
import type { AcademyAsset, AcademyBuyOutcome } from "@/lib/academy";
import { academyLabKitAssets } from "@/lib/academyKitStep";
import {
  ACADEMY_CHECKOUT_FAILED_LINE,
  ACADEMY_KIT_BUY_NOTE,
  ACADEMY_KIT_DOWNLOAD_LABEL,
  ACADEMY_SOLO_BUY_LABEL,
} from "@/lib/academyCopy";

/**
 * "Download the kit" for an entitled visitor, through the entitlement-gated kit assets
 * (listCourseKitAssets + academy_kits_select_entitled). Anyone else, signed out or not entitled,
 * sees the buy note with Buy. Entitled with no kit row yet: nothing.
 */
export function AcademyKitStep({
  hasAccess,
  kitAssets,
  onBuyCourse,
  testId = "academy-kit-step",
}: {
  hasAccess: boolean;
  kitAssets: AcademyAsset[];
  onBuyCourse: () => void | Promise<AcademyBuyOutcome>;
  testId?: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [buying, setBuying] = useState(false);
  const buyingRef = useRef(false);

  if (hasAccess) {
    const kits = academyLabKitAssets(kitAssets);
    if (kits.length === 0) return null;
    return (
      <AcademyKitDownload
        assets={kits}
        title={null}
        buttonLabel={ACADEMY_KIT_DOWNLOAD_LABEL}
        testId={testId}
      />
    );
  }

  const buy = async () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`${pathname}${search}`)}`);
      return;
    }
    if (buyingRef.current) return;
    buyingRef.current = true;
    setBuying(true);
    try {
      // On success the browser is on its way to Stripe: keep Buy disabled.
      await onBuyCourse();
    } catch {
      toast.error(ACADEMY_CHECKOUT_FAILED_LINE);
      buyingRef.current = false;
      setBuying(false);
    }
  };

  return (
    <div className="space-y-2 rounded-md border p-4" data-testid={testId}>
      <p className="text-sm">{ACADEMY_KIT_BUY_NOTE}</p>
      <Button type="button" onClick={buy} disabled={buying} aria-busy={buying}>
        {ACADEMY_SOLO_BUY_LABEL}
      </Button>
    </div>
  );
}
