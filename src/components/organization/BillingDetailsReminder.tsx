import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Receipt, X, ArrowRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useBillingProfile, BillingProfile } from "@/hooks/useBillingProfile";

const REQUIRED_FIELDS: (keyof BillingProfile)[] = [
  "company_legal_name",
  "address_line1",
  "city",
  "postal_code",
  "country",
];

export function isBillingProfileComplete(profile: BillingProfile | null | undefined): boolean {
  if (!profile) return false;
  return REQUIRED_FIELDS.every((f) => {
    const v = profile[f];
    return typeof v === "string" && v.trim().length > 0;
  });
}

interface Props {
  organizationId: string | undefined;
  organizationSlug?: string;
  variant?: "banner" | "inline";
  /** When true, banner can be dismissed and remembered in localStorage. */
  dismissible?: boolean;
  className?: string;
}

export function BillingDetailsReminder({
  organizationId,
  organizationSlug,
  variant = "banner",
  dismissible = false,
  className,
}: Props) {
  const { billingProfile, isLoading } = useBillingProfile(organizationId);
  const complete = useMemo(() => isBillingProfileComplete(billingProfile), [billingProfile]);

  const storageKey = organizationId ? `billing-reminder-dismissed:${organizationId}` : null;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!dismissible || !storageKey) return;
    try {
      setDismissed(localStorage.getItem(storageKey) === "1");
    } catch {
      // ignore
    }
  }, [storageKey, dismissible]);

  if (isLoading || !organizationId || complete) return null;
  if (dismissible && dismissed) return null;

  const settingsHref = organizationSlug
    ? `/dashboard/org/${organizationSlug}/settings?setup=billing`
    : `/dashboard`;

  const handleDismiss = () => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  if (variant === "inline") {
    return (
      <Alert className={className}>
        <Receipt className="h-4 w-4" />
        <AlertTitle>No company details on file</AlertTitle>
        <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm">
            Your invoice will only show your email. Add company details for properly addressed
            tax invoices.
          </span>
          <Button asChild size="sm" variant="outline">
            <Link to={settingsHref} target="_blank" rel="noopener noreferrer">
              Add company details
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className={className}>
      <Receipt className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between gap-2">
        <span>Add your company billing details</span>
        {dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm">
          We use these to issue proper tax invoices for every purchase — bundles, subscriptions,
          and any future product.
        </span>
        <Button asChild size="sm">
          <Link to={settingsHref}>
            Complete billing details
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
