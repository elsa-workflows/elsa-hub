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
import { NeutralityDisclaimer, AvailabilityStatusBadge } from "@/components/enterprise";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Loader2, Headphones } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExpertServicesProviders() {
  const { data: providers, isLoading } = useQuery({
    queryKey: ["service-providers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_providers")
        .select("id, name, slug, logo_url, availability_status, estimated_lead_time_days")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  return (
    <Layout>
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
                <BreadcrumbPage>Expert Services</BreadcrumbPage>
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
              Expert Advisory & Engineering
            </h1>
            <p className="text-xl text-muted-foreground">
              Connect with qualified service providers who offer expert guidance, 
              architecture reviews, and hands-on engineering support for Elsa Workflows.
            </p>
          </div>
        </div>
      </section>

      {/* Provider Listing */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-8">Providers</h2>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-48" />
                          <Skeleton className="h-4 w-96" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {providers?.map((provider) => (
                  <Link
                    key={provider.id}
                    to={`/elsa-plus/expert-services/${provider.slug}`}
                    className="block group"
                  >
                    <Card className="transition-all hover:border-primary/50 hover:shadow-md">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            {provider.logo_url ? (
                              <img
                                src={provider.logo_url}
                                alt={provider.name}
                                className="h-8 w-8 rounded object-contain"
                              />
                            ) : (
                              <Headphones className="h-6 w-6 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                                {provider.name}
                              </h3>
                              <AvailabilityStatusBadge
                                status={provider.availability_status}
                                estimatedLeadTimeDays={provider.estimated_lead_time_days}
                              />
                            </div>
                            <p className="text-muted-foreground text-sm">
                              Expert advisory and engineering services for Elsa Workflows
                            </p>
                          </div>
                          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}

                {providers?.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Headphones className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No providers are currently available.</p>
                  </div>
                )}
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
