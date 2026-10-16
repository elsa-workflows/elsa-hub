import { useEffect } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { OrgCloudMembershipGate } from "@/components/cloud/CloudRedirects";
import { CloudBillingPanel } from "@/components/cloud/CloudBillingPanel";
import { useCloudBilling } from "@/hooks/useCloudBilling";
import { useCloudConsolePaths } from "@/lib/cloudPaths";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function CloudBillingBody() {
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const billing = useCloudBilling();
  const { home } = useCloudConsolePaths();
  const inDashboard = pathname.startsWith("/dashboard");

  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment !== "cancelled" && payment !== "success") return;
    if (payment === "cancelled") {
      toast.message("Checkout cancelled", {
        description: "Your Elsa Cloud subscription was not changed.",
      });
    } else {
      toast.success("Checkout complete", {
        description: "Your Elsa Cloud plan will appear here once Control reports the entitlement.",
      });
    }
    const next = new URLSearchParams(searchParams);
    next.delete("payment");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  return (
    <section className={inDashboard ? "p-6" : "py-10 md:py-16"}>
      <div className={inDashboard ? "space-y-6" : "container max-w-3xl space-y-6"}>
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
          cloudLink={billing.cloudLink}
          onSubscribe={() => billing.startCheckout.mutate()}
          onManage={() => billing.openPortal.mutate()}
          checkoutPending={billing.startCheckout.isPending}
          portalPending={billing.openPortal.isPending}
        />

        <Button variant="ghost" asChild className="min-h-11">
          <Link to={home}>Back to Cloud</Link>
        </Button>
      </div>
    </section>
  );
}

export default function CloudBilling() {
  const { pathname } = useLocation();
  return (
    <OrgCloudMembershipGate>
      <>
        <Seo
          path={pathname}
          title="Cloud billing — Elsa+"
          description="Manage or cancel your Elsa Cloud subscription in Elsa Hub."
          noIndex
        />
        <CloudBillingBody />
      </>
    </OrgCloudMembershipGate>
  );
}
