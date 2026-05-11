import { CodeBlock } from "@/components/get-started";

const nuplaneFeedsJson = `{
  "Nuplane": {
    "Setup": {
      "AutomaticReconciliation": true,
      "PollInterval": "00:01:00",
      "Feeds": [
        {
          "Name": "local-packages",
          "DirectoryPath": "packages",
          "IncludePatterns": ["*"],
          "Directory": {
            "Watch": true,
            "DebounceWindow": "00:00:01"
          }
        },
        {
          "Name": "nuget.org",
          "ServiceIndex": "https://api.nuget.org/v3/index.json"
        },
        {
          "Name": "feedz.io",
          "ServiceIndex": "https://f.feedz.io/elsa-workflows/elsa-3/nuget/index.json",
          "IncludePatterns": [
            "Elsa.Persistence.EFCore.PostgreSql [3.8.0-preview,)",
            "Elsa.Scheduling.Quartz.EFCore.PostgreSql [3.8.0-preview,)",
            "Elsa.ServiceBus.MassTransit.RabbitMq [3.8.0-preview,)"
          ]
        }
      ]
    },
    "Loading": {
      "Enabled": true,
      "DefaultLoadMode": "Collectible",
      "PackageLoadModes": [
        { "PackageId": "Elsa.Persistence.EFCore.PostgreSql", "LoadMode": "HostIntegrated" },
        { "PackageId": "Elsa.Scheduling.Quartz.EFCore.PostgreSql", "LoadMode": "HostIntegrated" },
        { "PackageId": "Elsa.ServiceBus.MassTransit.RabbitMq", "LoadMode": "HostIntegrated" }
      ],
      "SharedAssemblies": [
        { "Name": "CShells.Abstractions" },
        { "Name": "CShells.AspNetCore.Abstractions" },
        { "Name": "Elsa" },
        { "Name": "Elsa.Common" }
      ]
    }
  }
}`;

const nuplaneCShellsJson = `{
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
        Nuplane is configured in two parts inside your <code className="font-mono">config.json</code>. First, a{" "}
        <code className="font-mono">Nuplane</code> section declares which NuGet feeds to use and how packages should
        be loaded. Then, a <code className="font-mono">CShells</code> section enables the capabilities those packages
        unlock — such as PostgreSQL persistence, RabbitMQ messaging, or Quartz scheduling — per shell.
      </p>
      <CodeBlock
        code={nuplaneFeedsJson}
        language="json"
        title="config.json — Nuplane feeds and package loading"
      />
      <p className="text-muted-foreground">
        With the packages available, enable and configure their features per shell. The example below activates
        PostgreSQL persistence for the default shell:
      </p>
      <CodeBlock
        code={nuplaneCShellsJson}
        language="json"
        title="config.json — CShells feature configuration"
      />
    </div>
  );
}
