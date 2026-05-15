import type { FeatureSchema } from "@/lib/runtime-builder/types";

export const featureSchemas: FeatureSchema[] = [
  // ── Persistence ─────────────────────────────────────────────
  {
    featureId: "Elsa.EntityFrameworkCore.PostgreSql",
    capabilityId: "postgresql-persistence",
    displayName: "PostgreSQL Persistence",
    settings: [
      {
        name: "connectionString",
        displayName: "Connection string",
        type: "string",
        required: true,
        secret: true,
        envHint: "POSTGRES_CONNECTION_STRING",
        placeholder: "Host=postgres;Port=5432;Database=elsa;Username=elsa;Password=elsa",
        description: "PostgreSQL connection string. Use an env var in production.",
      },
      {
        name: "enableMigrations",
        displayName: "Apply migrations on startup",
        type: "boolean",
        defaultValue: true,
      },
      {
        name: "schema",
        displayName: "Schema",
        type: "string",
        defaultValue: "public",
        advanced: true,
      },
    ],
  },
  {
    featureId: "Elsa.EntityFrameworkCore.SqlServer",
    capabilityId: "sqlserver-persistence",
    displayName: "SQL Server Persistence",
    settings: [
      {
        name: "connectionString",
        displayName: "Connection string",
        type: "string",
        required: true,
        secret: true,
        envHint: "SQLSERVER_CONNECTION_STRING",
        placeholder:
          "Server=mssql;Database=elsa;User Id=sa;Password=Your_strong_pwd;TrustServerCertificate=True",
      },
      {
        name: "enableMigrations",
        displayName: "Apply migrations on startup",
        type: "boolean",
        defaultValue: true,
      },
    ],
  },
  {
    featureId: "Elsa.EntityFrameworkCore.Sqlite",
    capabilityId: "sqlite-persistence",
    displayName: "SQLite Persistence",
    settings: [
      {
        name: "connectionString",
        displayName: "Connection string",
        type: "string",
        required: true,
        defaultValue: "Data Source=/data/elsa.db;Cache=Shared",
      },
    ],
  },

  // ── Messaging ───────────────────────────────────────────────
  {
    featureId: "Elsa.ServiceBus.MassTransit.RabbitMq",
    capabilityId: "rabbitmq-messaging",
    displayName: "RabbitMQ Messaging",
    settings: [
      {
        name: "host",
        displayName: "Broker host",
        type: "string",
        required: true,
        defaultValue: "rabbitmq",
        placeholder: "rabbitmq",
      },
      {
        name: "port",
        displayName: "Port",
        type: "number",
        defaultValue: 5672,
      },
      {
        name: "virtualHost",
        displayName: "Virtual host",
        type: "string",
        defaultValue: "/",
      },
      {
        name: "username",
        displayName: "Username",
        type: "string",
        defaultValue: "guest",
        envHint: "RABBITMQ_USER",
      },
      {
        name: "password",
        displayName: "Password",
        type: "string",
        secret: true,
        defaultValue: "guest",
        envHint: "RABBITMQ_PASSWORD",
      },
    ],
  },
  {
    featureId: "Elsa.ServiceBus.MassTransit.AzureServiceBus",
    capabilityId: "azure-servicebus-messaging",
    displayName: "Azure Service Bus",
    settings: [
      {
        name: "connectionString",
        displayName: "Connection string",
        type: "string",
        required: true,
        secret: true,
        envHint: "AZURE_SERVICEBUS_CONNECTION_STRING",
      },
    ],
  },

  // ── Cache / runtime ─────────────────────────────────────────
  {
    featureId: "Elsa.Caching.Distributed.Redis",
    capabilityId: "redis-cache",
    displayName: "Redis Cache",
    settings: [
      {
        name: "configuration",
        displayName: "Redis configuration",
        type: "string",
        required: true,
        defaultValue: "redis:6379",
        envHint: "REDIS_CONFIGURATION",
      },
      {
        name: "instanceName",
        displayName: "Instance name",
        type: "string",
        defaultValue: "elsa:",
        advanced: true,
      },
    ],
  },
  {
    featureId: "Elsa.Runtime.InMemory",
    capabilityId: "in-memory-runtime",
    displayName: "In-Memory Runtime",
    settings: [],
  },
  {
    featureId: "CShells.AspNetCore",
    capabilityId: "cshells-runtime",
    displayName: "CShells Runtime Extensions",
    settings: [
      {
        name: "automaticReconciliation",
        displayName: "Automatic reconciliation",
        type: "boolean",
        defaultValue: true,
      },
      {
        name: "pollInterval",
        displayName: "Poll interval",
        type: "string",
        defaultValue: "00:01:00",
        description: "TimeSpan format (HH:MM:SS).",
      },
    ],
  },

  // ── Scheduling ──────────────────────────────────────────────
  {
    featureId: "Elsa.Scheduling.Quartz.EFCore.PostgreSql",
    capabilityId: "scheduling-quartz",
    displayName: "Quartz Scheduling",
    settings: [
      {
        name: "useClustering",
        displayName: "Enable clustering",
        type: "boolean",
        defaultValue: false,
      },
      {
        name: "instanceId",
        displayName: "Scheduler instance id",
        type: "string",
        defaultValue: "AUTO",
        advanced: true,
      },
    ],
  },

  // ── Observability ───────────────────────────────────────────
  {
    featureId: "Elsa.OpenTelemetry",
    capabilityId: "open-telemetry",
    displayName: "OpenTelemetry",
    settings: [
      {
        name: "exporter",
        displayName: "Exporter",
        type: "enum",
        defaultValue: "otlp",
        enumValues: [
          { value: "otlp", label: "OTLP (recommended)" },
          { value: "console", label: "Console" },
          { value: "jaeger", label: "Jaeger" },
        ],
      },
      {
        name: "endpoint",
        displayName: "Exporter endpoint",
        type: "string",
        defaultValue: "http://otel-collector:4317",
        envHint: "OTEL_EXPORTER_OTLP_ENDPOINT",
      },
      {
        name: "serviceName",
        displayName: "Service name",
        type: "string",
        defaultValue: "elsa-server",
      },
    ],
  },

  // ── Identity ────────────────────────────────────────────────
  {
    featureId: "Elsa.Identity.Jwt",
    capabilityId: "identity-jwt",
    displayName: "JWT Identity",
    settings: [
      {
        name: "issuer",
        displayName: "Issuer",
        type: "string",
        required: true,
        defaultValue: "https://elsa.local",
      },
      {
        name: "audience",
        displayName: "Audience",
        type: "string",
        required: true,
        defaultValue: "elsa-api",
      },
      {
        name: "signingKey",
        displayName: "Signing key",
        type: "string",
        required: true,
        secret: true,
        envHint: "JWT_SIGNING_KEY",
        description: "Symmetric signing key. Use a strong, randomly generated value.",
      },
    ],
  },
  {
    featureId: "Elsa.Identity.OpenIdConnect",
    capabilityId: "identity-oidc",
    displayName: "OIDC / OAuth Identity",
    settings: [
      {
        name: "authority",
        displayName: "Authority",
        type: "string",
        required: true,
        placeholder: "https://login.example.com",
      },
      {
        name: "clientId",
        displayName: "Client id",
        type: "string",
        required: true,
        envHint: "OIDC_CLIENT_ID",
      },
      {
        name: "clientSecret",
        displayName: "Client secret",
        type: "string",
        required: true,
        secret: true,
        envHint: "OIDC_CLIENT_SECRET",
      },
    ],
  },

  // ── AI ──────────────────────────────────────────────────────
  {
    featureId: "Elsa.AI.Agents",
    capabilityId: "ai-agents",
    displayName: "AI Agents",
    settings: [
      {
        name: "provider",
        displayName: "Model provider",
        type: "enum",
        defaultValue: "openai",
        enumValues: [
          { value: "openai", label: "OpenAI" },
          { value: "azure-openai", label: "Azure OpenAI" },
          { value: "anthropic", label: "Anthropic" },
          { value: "ollama", label: "Ollama (local)" },
        ],
      },
      {
        name: "apiKey",
        displayName: "API key",
        type: "string",
        secret: true,
        envHint: "AI_PROVIDER_API_KEY",
      },
      {
        name: "defaultModel",
        displayName: "Default model",
        type: "string",
        defaultValue: "gpt-4o-mini",
      },
    ],
  },
  {
    featureId: "Elsa.AI.VectorStore",
    capabilityId: "ai-vector-store",
    displayName: "Vector Store",
    settings: [
      {
        name: "provider",
        displayName: "Provider",
        type: "enum",
        defaultValue: "qdrant",
        enumValues: [
          { value: "qdrant", label: "Qdrant" },
          { value: "pgvector", label: "pgvector (PostgreSQL)" },
          { value: "pinecone", label: "Pinecone" },
        ],
      },
      {
        name: "endpoint",
        displayName: "Endpoint",
        type: "string",
        placeholder: "http://qdrant:6333",
      },
      {
        name: "apiKey",
        displayName: "API key",
        type: "string",
        secret: true,
        envHint: "VECTOR_STORE_API_KEY",
      },
    ],
  },

  // ── Storage ─────────────────────────────────────────────────
  {
    featureId: "Elsa.Storage",
    capabilityId: "blob-storage",
    displayName: "Blob Storage",
    settings: [
      {
        name: "provider",
        displayName: "Storage provider",
        type: "enum",
        defaultValue: "local",
        enumValues: [
          { value: "local", label: "Local disk" },
          { value: "s3", label: "Amazon S3" },
          { value: "azure", label: "Azure Blob Storage" },
        ],
      },
      {
        name: "container",
        displayName: "Container / bucket",
        type: "string",
        defaultValue: "elsa-blobs",
      },
      {
        name: "connectionString",
        displayName: "Connection string",
        type: "string",
        secret: true,
        envHint: "BLOB_STORAGE_CONNECTION_STRING",
        advanced: true,
      },
    ],
  },
];
