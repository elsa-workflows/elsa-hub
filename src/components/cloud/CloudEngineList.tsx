import { Link } from "react-router-dom";
import { ArrowRight, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { CloudEngineSummary } from "@/lib/cloudClient";
import { useCloudConsolePaths } from "@/lib/cloudPaths";
import { cloudEngineStatusVariant } from "./engineStatus";

export function CloudEngineList({ engines }: { engines: CloudEngineSummary[] }) {
  const { engine: enginePath } = useCloudConsolePaths();
  return (
    <ul className="grid gap-3">
      {engines.map((engine) => (
        <li key={engine.id}>
          <Link to={enginePath(engine.id)} className="block">
            <Card className="hover:border-primary/50 transition-colors">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Server className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{engine.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Release {engine.release ?? "unknown"}
                  </p>
                </div>
                <Badge variant={cloudEngineStatusVariant(engine.status)}>{engine.status}</Badge>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
