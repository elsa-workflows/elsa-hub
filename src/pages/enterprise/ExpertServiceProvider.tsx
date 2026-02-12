import { lazy } from "react";
import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const ValenceWorks = lazy(() => import("./providers/ValenceWorks"));

const providerPages: Record<string, React.ComponentType> = {
  "valence-works": ValenceWorks,
};

export default function ExpertServiceProvider() {
  const { slug } = useParams<{ slug: string }>();
  const ProviderPage = slug ? providerPages[slug] : undefined;

  if (!ProviderPage) {
    return (
      <Layout>
        <div className="min-h-[50vh] flex flex-col items-center justify-center px-4">
          <h1 className="text-2xl font-bold mb-2">Provider Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The service provider you're looking for doesn't exist or hasn't been listed yet.
          </p>
          <Button asChild variant="outline">
            <Link to="/elsa-plus/expert-services">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Providers
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return <ProviderPage />;
}
