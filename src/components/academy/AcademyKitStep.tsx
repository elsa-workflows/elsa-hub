import { Button } from "@/components/ui/button";
import { AcademyKitDownload } from "@/components/academy/AcademyKitDownload";
import { AcademySoloOwnedNote } from "@/components/academy/AcademySoloCta";
import { useAcademyBuy, type AcademyBuyAction } from "@/hooks/useAcademyBuy";
import type { AcademyAsset } from "@/lib/academy";
import { academyLabKitAssets } from "@/lib/academyKitStep";
import {
  ACADEMY_KIT_BUY_NOTE,
  ACADEMY_KIT_DOWNLOAD_LABEL,
  ACADEMY_KIT_PENDING_NOTE,
  ACADEMY_SOLO_BUY_LABEL,
} from "@/lib/academyCopy";

type AcademyKitStepProps = {
  hasAccess: boolean;
  kitAssets: AcademyAsset[];
  onBuyCourse: AcademyBuyAction;
  /**
   * Set when the page already has a Solo CTA with its own Buy (the course page). Buy then links
   * to that CTA instead of starting a second checkout session from this step.
   */
  buyHref?: string;
  testId?: string;
};

/**
 * "Download the kit" for an entitled visitor, through the entitlement-gated kit assets
 * (listCourseKitAssets + academy_kits_select_entitled). Entitled with no kit row yet: nothing.
 * Anyone else sees the buy note with Buy (useAcademyBuy, the same flow as AcademySoloCta).
 * Back from Stripe with ?payment=success but no access yet: a pending note and no Buy, until the
 * page's entitlement poll flips hasAccess.
 */
export function AcademyKitStep(props: AcademyKitStepProps) {
  if (props.hasAccess) {
    const kits = academyLabKitAssets(props.kitAssets);
    if (kits.length === 0) return null;
    return (
      <AcademyKitDownload
        assets={kits}
        title={null}
        buttonLabel={ACADEMY_KIT_DOWNLOAD_LABEL}
        testId={props.testId ?? "academy-kit-step"}
      />
    );
  }
  return <AcademyKitBuyStep {...props} />;
}

function AcademyKitBuyStep({ onBuyCourse, buyHref, testId = "academy-kit-step" }: AcademyKitStepProps) {
  const { buy, buying, checkoutSaysOwned, paymentSuccess } = useAcademyBuy(onBuyCourse);

  let body;
  if (checkoutSaysOwned) {
    body = <AcademySoloOwnedNote />;
  } else if (paymentSuccess) {
    body = (
      <p data-testid="academy-kit-pending" className="text-sm text-muted-foreground">
        {ACADEMY_KIT_PENDING_NOTE}
      </p>
    );
  } else {
    body = (
      <>
        <p className="text-sm">{ACADEMY_KIT_BUY_NOTE}</p>
        {buyHref ? (
          <Button asChild>
            <a href={buyHref}>{ACADEMY_SOLO_BUY_LABEL}</a>
          </Button>
        ) : (
          <Button type="button" onClick={buy} disabled={buying} aria-busy={buying}>
            {ACADEMY_SOLO_BUY_LABEL}
          </Button>
        )}
      </>
    );
  }

  return (
    <div className="space-y-2 rounded-md border p-4" data-testid={testId}>
      {body}
    </div>
  );
}
