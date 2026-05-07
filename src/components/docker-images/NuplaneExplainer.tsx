import { CodeBlock } from "@/components/get-started";

const nuplaneJson = `{
  "CShells": {
    "Shells": {
      "Default": {
        "Features": {
          "PostgreSqlWorkflowPersistence": {
            "ConnectionString": "Host=postgres;Port=5432;Database=elsa;Username=elsa;Password=elsa"
          },
          "PostgreSqlIdentityPersistence": {
            "ConnectionString": "Host=postgres;Port=5432;Database=elsa;Username=elsa;Password=elsa"
          }
        }
      }
    }
  }
}`;

export function NuplaneExplainer() {
  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold">Extending via Nuplane</h2>
      <p className="text-muted-foreground">
        Configure a NuGet feed and a list of packages in your <code className="font-mono">config.json</code>, and
        Nuplane downloads and loads them on startup. Capabilities such as PostgreSQL, SQL Server, RabbitMQ, Azure
        Service Bus, and Quartz scheduling are then enabled per shell through CShells features. The catalog of feeds
        and packages will be documented separately.
      </p>
      <CodeBlock code={nuplaneJson} language="json" title="config.json — PostgreSQL persistence example" />
    </div>
  );
}
