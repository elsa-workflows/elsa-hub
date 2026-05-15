import type { Capability } from "@/lib/runtime-builder/types";

export const capabilities: Capability[] = [
  // ── Persistence ─────────────────────────────────────────────
  {
    id: "postgresql-persistence",
    displayName: "PostgreSQL Persistence",
    description: "Persist workflow state, instances and bookmarks in PostgreSQL.",
    category: "Persistence",
    recommended: true,
    features: [
      {
        id: "Elsa.EntityFrameworkCore.PostgreSql",
        displayName: "EF Core for PostgreSQL",
        packageId: "Elsa.EntityFrameworkCore.PostgreSql",
        packageVersion: "3.8.0",
      },
    ],
    conflicts: ["sqlite-persistence", "sqlserver-persistence"],
  },
  {
    id: "sqlserver-persistence",
    displayName: "SQL Server Persistence",
    description: "Persist workflow state in Microsoft SQL Server.",
    category: "Persistence",
    features: [
      {
        id: "Elsa.EntityFrameworkCore.SqlServer",
        displayName: "EF Core for SQL Server",
        packageId: "Elsa.EntityFrameworkCore.SqlServer",
        packageVersion: "3.8.0",
      },
    ],
    conflicts: ["postgresql-persistence", "sqlite-persistence"],
  },
  {
    id: "sqlite-persistence",
    displayName: "SQLite Persistence",
    description: "File-backed persistence. Great for dev, edge and small deployments.",
    category: "Persistence",
    features: [
      {
        id: "Elsa.EntityFrameworkCore.Sqlite",
        displayName: "EF Core for SQLite",
        packageId: "Elsa.EntityFrameworkCore.Sqlite",
        packageVersion: "3.8.0",
      },
    ],
    conflicts: ["postgresql-persistence", "sqlserver-persistence"],
  },

  // ── Messaging ───────────────────────────────────────────────
  {
    id: "rabbitmq-messaging",
    displayName: "RabbitMQ Messaging",
    description: "Reliable, distributed messaging via RabbitMQ + MassTransit.",
    category: "Messaging",
    recommended: true,
    features: [
      {
        id: "Elsa.ServiceBus.MassTransit.RabbitMq",
        displayName: "MassTransit · RabbitMQ",
        packageId: "Elsa.ServiceBus.MassTransit.RabbitMq",
        packageVersion: "3.8.0",
      },
    ],
    conflicts: ["azure-servicebus-messaging"],
  },
  {
    id: "azure-servicebus-messaging",
    displayName: "Azure Service Bus",
    description: "Use Azure Service Bus as the distributed message broker.",
    category: "Messaging",
    advanced: true,
    features: [
      {
        id: "Elsa.ServiceBus.MassTransit.AzureServiceBus",
        displayName: "MassTransit · Azure Service Bus",
        packageId: "Elsa.ServiceBus.MassTransit.AzureServiceBus",
        packageVersion: "3.8.0",
      },
    ],
    conflicts: ["rabbitmq-messaging"],
  },

  // ── Caching / runtime ───────────────────────────────────────
  {
    id: "redis-cache",
    displayName: "Redis Cache",
    description: "Distributed cache and runtime backplane backed by Redis.",
    category: "Runtime Extensions",
    features: [
      {
        id: "Elsa.Caching.Distributed.Redis",
        displayName: "Distributed cache (Redis)",
        packageId: "Elsa.Caching.Distributed.Redis",
        packageVersion: "3.8.0",
      },
    ],
    conflicts: ["in-memory-runtime"],
  },
  {
    id: "in-memory-runtime",
    displayName: "In-Memory Runtime",
    description: "Single-node, in-memory cache and bookmarks. Not for clusters.",
    category: "Runtime Extensions",
    features: [
      {
        id: "Elsa.Runtime.InMemory",
        displayName: "In-memory runtime",
        packageId: "Elsa.Runtime.InMemory",
        packageVersion: "3.8.0",
      },
    ],
    conflicts: ["redis-cache"],
  },
  {
    id: "cshells-runtime",
    displayName: "CShells Runtime Extensions",
    description: "Modular shell-based runtime extensibility for Elsa Pro.",
    category: "Runtime Extensions",
    advanced: true,
    features: [
      {
        id: "CShells.AspNetCore",
        displayName: "CShells for ASP.NET Core",
        packageId: "CShells.AspNetCore",
        packageVersion: "1.4.0",
      },
    ],
  },

  // ── Scheduling ──────────────────────────────────────────────
  {
    id: "scheduling-quartz",
    displayName: "Quartz Scheduling",
    description: "Cron-style and durable scheduling backed by Quartz.NET.",
    category: "Scheduling",
    recommended: true,
    features: [
      {
        id: "Elsa.Scheduling.Quartz.EFCore.PostgreSql",
        displayName: "Quartz with EF Core (PostgreSQL)",
        packageId: "Elsa.Scheduling.Quartz.EFCore.PostgreSql",
        packageVersion: "3.8.0",
      },
    ],
  },

  // ── Observability ───────────────────────────────────────────
  {
    id: "open-telemetry",
    displayName: "OpenTelemetry",
    description: "Traces, metrics and logs exported via OTLP.",
    category: "Observability",
    recommended: true,
    features: [
      {
        id: "Elsa.OpenTelemetry",
        displayName: "OpenTelemetry exporter",
        packageId: "Elsa.OpenTelemetry",
        packageVersion: "3.8.0",
      },
    ],
  },

  // ── Identity ────────────────────────────────────────────────
  {
    id: "identity-jwt",
    displayName: "JWT Identity",
    description: "Built-in JWT-based authentication.",
    category: "Authentication",
    recommended: true,
    features: [
      {
        id: "Elsa.Identity.Jwt",
        displayName: "Elsa Identity (JWT)",
        packageId: "Elsa.Identity.Jwt",
        packageVersion: "3.8.0",
      },
    ],
  },
  {
    id: "identity-oidc",
    displayName: "OIDC / OAuth Identity",
    description: "Federate sign-in with any OpenID Connect provider.",
    category: "Authentication",
    advanced: true,
    features: [
      {
        id: "Elsa.Identity.OpenIdConnect",
        displayName: "Elsa Identity (OIDC)",
        packageId: "Elsa.Identity.OpenIdConnect",
        packageVersion: "3.8.0",
      },
    ],
  },

  // ── AI ──────────────────────────────────────────────────────
  {
    id: "ai-agents",
    displayName: "AI Agents",
    description: "Author and run AI agents inside workflows.",
    category: "AI",
    features: [
      {
        id: "Elsa.AI.Agents",
        displayName: "Elsa AI Agents",
        packageId: "Elsa.AI.Agents",
        packageVersion: "1.0.0-preview.3",
      },
    ],
  },
  {
    id: "ai-vector-store",
    displayName: "Vector Store",
    description: "Pluggable vector storage for retrieval-augmented workflows.",
    category: "AI",
    advanced: true,
    features: [
      {
        id: "Elsa.AI.VectorStore",
        displayName: "Elsa Vector Store",
        packageId: "Elsa.AI.VectorStore",
        packageVersion: "1.0.0-preview.3",
      },
    ],
    dependencies: ["ai-agents"],
  },

  // ── Storage ─────────────────────────────────────────────────
  {
    id: "blob-storage",
    displayName: "Blob Storage",
    description:
      "Store binary attachments and large workflow payloads in S3, Azure Blob or local disk.",
    category: "Storage",
    features: [
      {
        id: "Elsa.Storage",
        displayName: "Elsa Blob Storage",
        packageId: "Elsa.Storage",
        packageVersion: "3.8.0",
      },
    ],
  },
];
