import { useParams } from "react-router-dom";
import { Construction } from "lucide-react";

export default function ProviderOverview() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Provider Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview for {slug}
        </p>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
        <Construction className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Coming Soon</h2>
        <p className="text-muted-foreground max-w-md">
          The service provider dashboard is under development. 
          This area will include customer management, work logging, and bundle configuration.
        </p>
      </div>
    </div>
  );
}
