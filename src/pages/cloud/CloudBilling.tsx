import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { Layout } from "@/components/layout/Layout";
import { CloudAuthGate } from "@/components/cloud/CloudAuthGate";
import { CloudBillingPanel } from "@/components/cloud/CloudBillingPanel";
import { useCloudBilling } from "@/hooks/useCloudBilling";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function CloudBillingBody() {
  const [searchParams, setSearchParams] = useSearchParams();
  const billing = useCloudBilling();

  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "cancelled") {
      toast.message("Checkout cancelled", {
        description: "Your Elsa Cloud subscription was not changed.",
      });
      const next = new URLSearchParams(searchParams);
      next.delete("payment");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <div className="container max-w-3xl py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cloud billing</h1>
        <p className="text-muted-foreground mt-2">
          Plan, status, and subscription management for Elsa Cloud. This is not the public
          pricing page.
        </p>
      </div>

      <CloudBillingPanel
        isLoading={billing.isLoading}
        error={billing.error}
        planName={billing.planName}
        planStatus={billing.planStatus}
        subscription={billing.subscription}
        canManage={billing.canManage}
        hasOrganization={Boolean(billing.organizationId)}
        billingAccount={billing.billingAccount}
        onSubscribe={() => billing.startCheckout.mutate()}
        onManage={() => billing.openPortal.mutate()}
        checkoutPending={billing.startCheckout.isPending}
        portalPending={billing.openPortal.isPending}
      />

      <Button variant="ghost" asChild className="min-h-11">
        <Link to="/cloud">Back to Cloud</Link>
      </Button>
    </div>
  );
}

export default function CloudBilling() {
  return (
    <Layout>
      <Seo
        path="/cloud/billing"
        title="Cloud billing — Elsa+"
        description="Manage or cancel your Elsa Cloud subscription in Elsa Hub."
        noIndex
      />
      <CloudAuthGate>
        <CloudBillingBody />
      </CloudAuthGate>
    </Layout>
  );
}
