import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { Layout } from "@/components/layout/Layout";
import { CloudAuthGate } from "@/components/cloud/CloudAuthGate";
import { CloudBillingPanel } from "@/components/cloud/CloudBillingPanel";
import { useCloudBilling } from "@/hooks/useCloudBilling";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function CloudHomeBody() {
  const [searchParams, setSearchParams] = useSearchParams();
  const billing = useCloudBilling();

  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "success") {
      toast.success("Checkout complete", {
        description: "Your Elsa Cloud plan will appear here once Control reports the entitlement.",
      });
      const next = new URLSearchParams(searchParams);
      next.delete("payment");
      setSearchParams(next, { replace: true });
      billing.refresh();
    }
    // billing.refresh is stable enough for this post-checkout toast.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setSearchParams]);

  return (
    <div className="container max-w-3xl py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Elsa Cloud</h1>
        <p className="text-muted-foreground mt-2">
          Your hosted Elsa engines and subscription live here.
        </p>
      </div>

      {billing.planName ? (
        <p>
          Current plan: <span className="font-medium">{billing.planName}</span>
        </p>
      ) : (
        <p className="text-muted-foreground">
          No engines yet. Subscribe to Elsa Cloud to get started. The plan appears once Control
          reports the entitlement.
        </p>
      )}

      <CloudBillingPanel
        isLoading={billing.isLoading}
        error={billing.error}
        planName={billing.planName}
        planStatus={billing.planStatus}
        subscription={billing.subscription}
        canManage={billing.canManage}
        hasOrganization={Boolean(billing.organizationId)}
        billingAccount={billing.billingAccount}
        cloudLink={billing.cloudLink}
        onSubscribe={() => billing.startCheckout.mutate()}
        onManage={() => billing.openPortal.mutate()}
        checkoutPending={billing.startCheckout.isPending}
        portalPending={billing.openPortal.isPending}
      />

      <Button variant="outline" asChild className="min-h-11">
        <Link to="/cloud/billing">Billing details</Link>
      </Button>
    </div>
  );
}

export default function CloudHome() {
  return (
    <Layout>
      <Seo
        path="/cloud"
        title="Elsa Cloud — Elsa+"
        description="Manage your Elsa Cloud engines and subscription in Elsa Hub."
        noIndex
      />
      <CloudAuthGate>
        <CloudHomeBody />
      </CloudAuthGate>
    </Layout>
  );
}
