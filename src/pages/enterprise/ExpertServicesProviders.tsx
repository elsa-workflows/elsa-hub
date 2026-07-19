import { Seo } from "@/components/Seo";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { NeutralityDisclaimer, ProviderTile } from "@/components/enterprise";
import { supabase } from "@/integrations/supabase/client";
import { Headphones } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function ExpertServicesProviders() {
  const { data: providers, isLoading } = useQuery({
    queryKey: ["service-providers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_providers")
        .select("id, name, slug, logo_url, availability_status, estimated_lead_time_days, booking_url")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  return (
    <Layout>
      <Seo path="/elsa-plus/expert-services" title="Elsa expert services — Elsa+" description="Vetted independent providers offering Elsa Workflows expert services: implementation help, advisory, and priority support." />
      {/* Breadcrumb */}
      <section className="pt-8 pb-4">
        <div className="container">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/elsa-plus">Elsa+</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Expert Services & Support</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </section>

      {/* Hero */}
      <section className="py-12 md:py-20 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Expert Advisory, Engineering & Support
            </h1>
            <p className="text-xl text-muted-foreground">
              Connect with qualified service providers who offer expert guidance, 
              architecture reviews, priority support, and hands-on engineering for Elsa Workflows.
            </p>
          </div>
        </div>
      </section>

      {/* Provider Listing */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-8 text-2xl font-bold">Providers</h2>

            {isLoading ? (
              <div className="grid gap-6 sm:grid-cols-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-[360px] w-full rounded-xl" />
                ))}
              </div>
            ) : providers && providers.length > 0 ? (
              <div
                className={cn(
                  "grid gap-6",
                  providers.length === 1
                    ? "mx-auto max-w-md"
                    : "sm:grid-cols-2 lg:grid-cols-2",
                )}
              >
                {providers.map((provider) => (
                  <ProviderTile key={provider.id} provider={provider as any} />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <Headphones className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p>No providers are currently available.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Neutrality Disclaimer */}
      <section className="pb-16 md:pb-24">
        <div className="container max-w-4xl">
          <NeutralityDisclaimer />
        </div>
      </section>
    </Layout>
  );
}
