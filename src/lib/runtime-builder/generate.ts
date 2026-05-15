import type {
  BuilderState,
  Catalog,
  GeneratedFile,
  SettingSchema,
} from "./types";
import {
  envVarFromHint,
  findCapability,
  findImage,
  findSchema,
  flattenSettings,
} from "./catalog-utils";

interface GenerateContext {
  state: BuilderState;
  catalog: Catalog;
}

interface CollectedSecret {
  envVar: string;
  description: string;
  defaultValue?: string;
}

function collectSecrets(ctx: GenerateContext): CollectedSecret[] {
  const out: CollectedSecret[] = [];
  for (const capId of ctx.state.capabilityIds) {
    const cap = findCapability(ctx.catalog, capId);
    if (!cap) continue;
    for (const featureRef of cap.features) {
      const schema = findSchema(ctx.catalog, featureRef.id);
      if (!schema) continue;
      const settings = flattenSettings(schema.settings);
      for (const s of settings) {
        if (s.envHint) {
          const envVar = envVarFromHint(s.envHint);
          out.push({
            envVar,
            description: `${schema.displayName} · ${s.displayName}`,
            defaultValue: typeof s.defaultValue === "string" ? s.defaultValue : undefined,
          });
        }
      }
    }
  }
  return dedupe(out, (x) => x.envVar);
}

function dedupe<T>(items: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

function settingValueOrEnv(
  setting: SettingSchema,
  rawValue: unknown,
): unknown {
  if (setting.secret && setting.envHint) {
    return `\${${envVarFromHint(setting.envHint)}}`;
  }
  if (rawValue === undefined || rawValue === "") {
    return setting.defaultValue ?? "";
  }
  return rawValue;
}

function buildConfigJson(ctx: GenerateContext): string {
  const config: Record<string, unknown> = {
    Elsa: {
      Server: {
        Url: "http://+:5000",
      },
    },
  };
  const elsa = config.Elsa as Record<string, unknown>;

  for (const capId of ctx.state.capabilityIds) {
    const cap = findCapability(ctx.catalog, capId);
    if (!cap) continue;
    for (const featureRef of cap.features) {
      const schema = findSchema(ctx.catalog, featureRef.id);
      if (!schema) continue;
      const values = ctx.state.settings[featureRef.id] ?? {};
      const node: Record<string, unknown> = {};
      for (const setting of schema.settings) {
        node[capitalize(setting.name)] = settingValueOrEnv(setting, values[setting.name]);
      }
      // Group under the last package segment for readability.
      const key = featureRef.packageId.split(".").slice(-2).join(".");
      elsa[key] = node;
    }
  }
  return JSON.stringify(config, null, 2);
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildPackagesLock(ctx: GenerateContext): string {
  const packages: Array<{ id: string; version: string; capability: string }> = [];
  for (const capId of ctx.state.capabilityIds) {
    const cap = findCapability(ctx.catalog, capId);
    if (!cap) continue;
    for (const featureRef of cap.features) {
      const overridden = ctx.state.overrides[featureRef.packageId];
      packages.push({
        id: featureRef.packageId,
        version: overridden ?? featureRef.packageVersion,
        capability: cap.displayName,
      });
    }
  }
  return JSON.stringify(
    {
      version: 1,
      generatedAt: new Date().toISOString(),
      catalogVersion: ctx.catalog.version,
      packages,
    },
    null,
    2,
  );
}

function indent(value: string, spaces = 2): string {
  return value
    .split("\n")
    .map((line) => (line ? " ".repeat(spaces) + line : line))
    .join("\n");
}

function buildDockerCompose(ctx: GenerateContext): string {
  const image = findImage(ctx.catalog, ctx.state.imageId);
  if (!image) return "# Select a runtime image first.";
  const tag = ctx.state.imageVersion ?? image.versions[0];

  const usesPostgres = ctx.state.capabilityIds.includes("postgresql-persistence");
  const usesRabbit = ctx.state.capabilityIds.includes("rabbitmq-messaging");
  const usesRedis = ctx.state.capabilityIds.includes("redis-cache");

  const serverEnv: string[] = [];
  if (usesPostgres) {
    serverEnv.push(
      `ConnectionStrings__Postgres: \${POSTGRES_CONNECTION_STRING}`,
    );
  }
  if (usesRabbit) {
    serverEnv.push(`Elsa__RabbitMq__Host: rabbitmq`);
    serverEnv.push(`Elsa__RabbitMq__Username: \${RABBITMQ_USER}`);
    serverEnv.push(`Elsa__RabbitMq__Password: \${RABBITMQ_PASSWORD}`);
  }
  if (usesRedis) {
    serverEnv.push(`Elsa__Redis__Configuration: \${REDIS_CONFIGURATION}`);
  }
  serverEnv.push(`ASPNETCORE_ENVIRONMENT: Production`);

  const dependsOn: string[] = [];
  if (usesPostgres) dependsOn.push("postgres");
  if (usesRabbit) dependsOn.push("rabbitmq");
  if (usesRedis) dependsOn.push("redis");

  const lines: string[] = [];
  lines.push("services:");
  lines.push("");
  lines.push("  elsa:");
  lines.push(`    image: ${image.dockerImage}:${tag}`);
  lines.push(`    container_name: elsa`);
  lines.push(`    ports:`);
  lines.push(`      - "5000:5000"`);
  lines.push(`    environment:`);
  for (const env of serverEnv) lines.push(`      ${env}`);
  lines.push(`    volumes:`);
  lines.push(`      - ./config.json:/app/appsettings.Production.json:ro`);
  if (dependsOn.length > 0) {
    lines.push(`    depends_on:`);
    for (const dep of dependsOn) {
      lines.push(`      ${dep}:`);
      lines.push(`        condition: service_healthy`);
    }
  }

  if (usesPostgres) {
    lines.push("");
    lines.push("  postgres:");
    lines.push("    image: postgres:16");
    lines.push("    environment:");
    lines.push("      POSTGRES_USER: elsa");
    lines.push("      POSTGRES_PASSWORD: elsa");
    lines.push("      POSTGRES_DB: elsa");
    lines.push("    volumes:");
    lines.push("      - postgres-data:/var/lib/postgresql/data");
    lines.push("    ports:");
    lines.push('      - "5432:5432"');
    lines.push("    healthcheck:");
    lines.push('      test: ["CMD-SHELL", "pg_isready -U elsa -d elsa"]');
    lines.push("      interval: 10s");
    lines.push("      timeout: 5s");
    lines.push("      retries: 5");
  }

  if (usesRabbit) {
    lines.push("");
    lines.push("  rabbitmq:");
    lines.push('    image: "rabbitmq:4-management"');
    lines.push("    ports:");
    lines.push('      - "15672:15672"');
    lines.push('      - "5672:5672"');
    lines.push("    healthcheck:");
    lines.push('      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]');
    lines.push("      interval: 10s");
    lines.push("      timeout: 5s");
    lines.push("      retries: 5");
  }

  if (usesRedis) {
    lines.push("");
    lines.push("  redis:");
    lines.push("    image: redis:7-alpine");
    lines.push("    ports:");
    lines.push('      - "6379:6379"');
    lines.push("    healthcheck:");
    lines.push('      test: ["CMD", "redis-cli", "ping"]');
    lines.push("      interval: 10s");
    lines.push("      timeout: 5s");
    lines.push("      retries: 5");
  }

  if (usesPostgres) {
    lines.push("");
    lines.push("volumes:");
    lines.push("  postgres-data:");
  }

  return lines.join("\n") + "\n";
}

function buildEnvExample(ctx: GenerateContext): string {
  const secrets = collectSecrets(ctx);
  if (secrets.length === 0) {
    return "# No environment variables required for the current selection.\n";
  }
  const lines: string[] = [
    "# Environment variables for your Elsa deployment.",
    "# Fill in the values below before starting the stack.",
    "",
  ];
  for (const secret of secrets) {
    lines.push(`# ${secret.description}`);
    lines.push(`${secret.envVar}=${secret.defaultValue ?? ""}`);
    lines.push("");
  }
  return lines.join("\n");
}

function buildReadme(ctx: GenerateContext): string {
  const image = findImage(ctx.catalog, ctx.state.imageId);
  if (!image) return "# Elsa deployment\n\nSelect a runtime image first.";
  const tag = ctx.state.imageVersion ?? image.versions[0];
  const capLines = ctx.state.capabilityIds
    .map((id) => findCapability(ctx.catalog, id))
    .filter(Boolean)
    .map((cap) => `- **${cap!.displayName}** — ${cap!.description}`);

  return `# Elsa deployment bundle

Generated with the [Elsa Runtime Builder](https://elsa-workflows.io/elsa-plus/runtime-builder).

## Runtime image

- Image: \`${image.dockerImage}:${tag}\`
- License tier: ${image.licenseTier}
- Stability: ${image.stability}
- Elsa version: ${image.elsaVersion}

## Capabilities

${capLines.length > 0 ? capLines.join("\n") : "_No capabilities enabled yet._"}

## Files in this bundle

- \`config.json\` — application settings consumed by Elsa.
- \`packages.lock.json\` — resolved NuGet packages and versions.
- \`docker-compose.yml\` — local-friendly Compose stack.
- \`.env.example\` — environment variables to fill in.

## Quick start

\`\`\`bash
cp .env.example .env
# Edit .env with your secrets, then:
docker compose up -d
\`\`\`

The Elsa API is exposed on http://localhost:5000.
`;
}

export function generateBundleFiles(
  state: BuilderState,
  catalog: Catalog,
): GeneratedFile[] {
  const ctx: GenerateContext = { state, catalog };
  return [
    { path: "config.json", language: "json", contents: buildConfigJson(ctx) },
    {
      path: "packages.lock.json",
      language: "json",
      contents: buildPackagesLock(ctx),
    },
    {
      path: "docker-compose.yml",
      language: "yaml",
      contents: buildDockerCompose(ctx),
    },
    { path: ".env.example", language: "ini", contents: buildEnvExample(ctx) },
    { path: "README.md", language: "markdown", contents: buildReadme(ctx) },
  ];
}
