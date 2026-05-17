// V2 bundle generation, infrastructure-provider driven.

import type {
  BuilderStateV2,
  CatalogV2,
  InfraKind,
  InfrastructureProvider,
  InfrastructureSelection,
} from "./types-v2";
import type { GeneratedFile as LegacyGeneratedFile } from "./types";
import { findFeature, findPackage, findProvider } from "./requirements";
import { findBuilderImage, DEFAULT_IMAGE_SLUG } from "./images";

// Re-export the generated-file shape from the legacy types module so callers
// don't need to know which file it's defined in.
export type { GeneratedFile } from "./types";

interface Ctx {
  state: BuilderStateV2;
  catalog: CatalogV2;
}

function envName(parts: string[]): string {
  return parts
    .map((p) => p.replace(/[^A-Za-z0-9]+/g, "_"))
    .join("__")
    .toUpperCase();
}

function defaultEnvForOutput(provider: InfrastructureProvider, output: string): string {
  switch (output) {
    case "connectionString":
      return envName([provider.provider, "CONNECTION_STRING"]);
    case "host":
      return envName([provider.provider, "HOST"]);
    case "port":
      return envName([provider.provider, "PORT"]);
    default:
      return envName([provider.provider, output]);
  }
}

interface ComposeFragment {
  serviceName: string;
  yaml: string;
  volumes?: string[];
  envForElsa: Record<string, string>; // ENV → value (string with ${VAR} refs OK)
}

function composeFragment(provider: InfrastructureProvider): ComposeFragment | null {
  const name = provider.provider;
  switch (provider.id) {
    case "postgres-compose":
      return {
        serviceName: "postgres",
        yaml: [
          "  postgres:",
          "    image: postgres:16",
          "    environment:",
          "      POSTGRES_USER: elsa",
          "      POSTGRES_PASSWORD: elsa",
          "      POSTGRES_DB: elsa",
          "    volumes:",
          "      - postgres-data:/var/lib/postgresql/data",
          "    ports:",
          '      - "5432:5432"',
          "    healthcheck:",
          '      test: ["CMD-SHELL", "pg_isready -U elsa -d elsa"]',
          "      interval: 10s",
          "      timeout: 5s",
          "      retries: 5",
        ].join("\n"),
        volumes: ["postgres-data"],
        envForElsa: {
          ConnectionStrings__Postgres:
            "Host=postgres;Database=elsa;Username=elsa;Password=elsa",
        },
      };
    case "sqlserver-compose":
      return {
        serviceName: "sqlserver",
        yaml: [
          "  sqlserver:",
          "    image: mcr.microsoft.com/mssql/server:2022-latest",
          "    environment:",
          "      ACCEPT_EULA: Y",
          "      MSSQL_SA_PASSWORD: ${SQLSERVER_SA_PASSWORD}",
          "    ports:",
          '      - "1433:1433"',
          "    volumes:",
          "      - sqlserver-data:/var/opt/mssql",
        ].join("\n"),
        volumes: ["sqlserver-data"],
        envForElsa: {
          ConnectionStrings__SqlServer:
            "Server=sqlserver;Database=elsa;User Id=sa;Password=${SQLSERVER_SA_PASSWORD};TrustServerCertificate=true",
        },
      };
    case "rabbitmq-compose":
      return {
        serviceName: "rabbitmq",
        yaml: [
          "  rabbitmq:",
          '    image: "rabbitmq:4-management"',
          "    ports:",
          '      - "5672:5672"',
          '      - "15672:15672"',
          "    healthcheck:",
          '      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]',
          "      interval: 10s",
          "      timeout: 5s",
          "      retries: 5",
        ].join("\n"),
        envForElsa: {
          Elsa__RabbitMq__Host: "rabbitmq",
          Elsa__RabbitMq__Username: "guest",
          Elsa__RabbitMq__Password: "guest",
        },
      };
    case "redis-compose":
      return {
        serviceName: "redis",
        yaml: [
          "  redis:",
          "    image: redis:7-alpine",
          "    ports:",
          '      - "6379:6379"',
          "    healthcheck:",
          '      test: ["CMD", "redis-cli", "ping"]',
          "      interval: 10s",
          "      timeout: 5s",
          "      retries: 5",
        ].join("\n"),
        envForElsa: {
          Elsa__Redis__Configuration: "redis:6379",
        },
      };
    case "azurite-compose":
      return {
        serviceName: "azurite",
        yaml: [
          "  azurite:",
          "    image: mcr.microsoft.com/azure-storage/azurite",
          "    ports:",
          '      - "10000:10000"',
          '      - "10001:10001"',
          '      - "10002:10002"',
        ].join("\n"),
        envForElsa: {
          Elsa__BlobStorage__ConnectionString:
            "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://azurite:10000/devstoreaccount1;",
        },
      };
    case "mailpit-compose":
      return {
        serviceName: "mailpit",
        yaml: [
          "  mailpit:",
          "    image: axllent/mailpit",
          "    ports:",
          '      - "1025:1025"',
          '      - "8025:8025"',
        ].join("\n"),
        envForElsa: {
          Elsa__Smtp__Host: "mailpit",
          Elsa__Smtp__Port: "1025",
        },
      };
    default:
      return {
        serviceName: name,
        yaml: `  ${name}:\n    # No built-in compose template for ${provider.id}. Configure manually.`,
        envForElsa: {},
      };
  }
}

function externalEnvVars(
  provider: InfrastructureProvider,
  selection: InfrastructureSelection,
): Record<string, string> {
  const env: Record<string, string> = {};
  for (const output of provider.outputs) {
    const envVar = defaultEnvForOutput(provider, output);
    const setting = (selection.settings ?? {})[output];
    env[envVar] = typeof setting === "string" && setting !== "" ? setting : "";
  }
  return env;
}

function buildAppSettings(ctx: Ctx): string {
  const config: Record<string, unknown> = {
    Elsa: { Server: { Url: "http://+:5000" } },
  };
  const elsa = config.Elsa as Record<string, unknown>;
  for (const sp of ctx.state.selectedPackages) {
    const pkg = findPackage(ctx.catalog, sp.packageId);
    if (!pkg) continue;
    const pkgKey = pkg.id.split(".").slice(-2).join(".");
    const node: Record<string, unknown> = {};
    for (const featureId of sp.selectedFeatures) {
      const feature = findFeature(pkg, featureId);
      if (!feature) continue;
      const values = sp.settings[featureId] ?? {};
      const featureNode: Record<string, unknown> = {};
      for (const setting of feature.settings) {
        const v = values[setting.name];
        featureNode[capitalize(setting.name)] =
          v === undefined || v === "" ? setting.defaultValue ?? "" : v;
      }
      node[feature.displayName.replace(/\s+/g, "")] = featureNode;
    }
    elsa[pkgKey] = node;
  }
  return JSON.stringify(config, null, 2);
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function buildProgramCs(ctx: Ctx): string {
  const lines: string[] = [
    "// Generated by Elsa Runtime Builder (preview).",
    "// Wire-up is illustrative — adapt to your project layout.",
    "",
    "var builder = WebApplication.CreateBuilder(args);",
    "",
    "builder.Services.AddElsa(elsa =>",
    "{",
  ];
  for (const sp of ctx.state.selectedPackages) {
    const pkg = findPackage(ctx.catalog, sp.packageId);
    if (!pkg) continue;
    lines.push(`    // ${pkg.displayName} (${pkg.id} ${sp.version})`);
    if (sp.selectedFeatures.length === 0) {
      lines.push(`    // - no features selected`);
    } else {
      for (const featureId of sp.selectedFeatures) {
        const feature = findFeature(pkg, featureId);
        lines.push(`    // - ${feature?.displayName ?? featureId}`);
        const useName = featureId
          .split(".")
          .slice(-1)[0]
          .replace(/(^|-)([a-z])/g, (_, _s, c: string) => c.toUpperCase());
        lines.push(`    elsa.Use${useName}();`);
      }
    }
    lines.push("");
  }
  lines.push("});");
  lines.push("");
  lines.push("var app = builder.Build();");
  lines.push("app.UseElsa();");
  lines.push("app.Run();");
  return lines.join("\n") + "\n";
}

function buildAppService(opts: {
  image: ReturnType<typeof getSelectedImage>;
  envForElsa: Record<string, string>;
  dependsOn: string[];
  isCompanion?: boolean;
}): string[] {
  const { image, envForElsa, dependsOn, isCompanion } = opts;
  const lines: string[] = [];
  lines.push(`  ${image.containerName}:`);
  lines.push(`    image: ${image.image}:${image.tag}`);
  lines.push(`    container_name: ${image.containerName}`);
  lines.push("    ports:");
  lines.push(`      - "${image.hostPort}:${image.containerPort}"`);
  if (Object.keys(envForElsa).length > 0) {
    lines.push("    environment:");
    for (const [k, v] of Object.entries(envForElsa)) {
      lines.push(`      ${k}: ${v}`);
    }
  }
  if (!isCompanion && dependsOn.length > 0) {
    lines.push("    depends_on:");
    for (const dep of dependsOn) {
      lines.push(`      ${dep}:`);
      lines.push(`        condition: service_healthy`);
    }
  }
  return lines;
}

function getSelectedImage(ctx: Ctx) {
  // Lazy import to keep this module dependency-light at the top.
  const { findBuilderImage, DEFAULT_IMAGE_SLUG } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("./images") as typeof import("./images");
  const sel = ctx.state.imageSelection ?? {
    slug: DEFAULT_IMAGE_SLUG,
    tag: "latest",
    hostPort: 8080,
  };
  const img = findBuilderImage(sel.slug) ?? findBuilderImage(DEFAULT_IMAGE_SLUG)!;
  return {
    slug: img.slug,
    name: img.name,
    role: img.role,
    image: img.image,
    tag: sel.tag || "latest",
    hostPort: sel.hostPort || img.defaultHostPort,
    containerPort: img.containerPort,
    containerName: img.containerName,
    requiresServer: img.requiresServer,
    envDefaults: img.envDefaults,
  };
}

function buildDockerCompose(ctx: Ctx): {
  content: string;
  envForElsa: Record<string, string>;
} {
  const selected = getSelectedImage(ctx);
  const lines: string[] = ["services:"];

  const envForElsa: Record<string, string> = {
    ASPNETCORE_ENVIRONMENT: "Production",
  };
  // Seed required env vars defined by the chosen image so the compose file is
  // self-documenting. Infra-derived envs below take precedence.
  for (const e of selected.envDefaults) {
    if (e.required && !(e.key in envForElsa)) {
      envForElsa[e.key] = e.value || "${" + e.key + "}";
    }
  }

  const dependsOn: string[] = [];
  const sidecarBlocks: string[] = [];
  const volumes = new Set<string>();

  for (const sel of ctx.state.infrastructureSelections) {
    const provider = findProvider(ctx.catalog, sel.providerId);
    if (!provider) continue;
    if (sel.strategy === "compose-sidecar") {
      const fragment = composeFragment(provider);
      if (!fragment) continue;
      sidecarBlocks.push(fragment.yaml);
      dependsOn.push(fragment.serviceName);
      Object.assign(envForElsa, fragment.envForElsa);
      for (const v of fragment.volumes ?? []) volumes.add(v);
    } else if (sel.strategy === "external-service" || sel.strategy === "managed") {
      const ext = externalEnvVars(provider, sel);
      for (const [k, v] of Object.entries(ext)) {
        envForElsa[k] = v ? v : "${" + k + "}";
      }
    }
  }

  lines.push("");
  lines.push(...buildAppService({ image: selected, envForElsa, dependsOn }));

  // Studio needs a Server companion to be runnable.
  if (selected.role === "studio") {
    const { findBuilderImage } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("./images") as typeof import("./images");
    const server = findBuilderImage("elsa-pro-server");
    if (server) {
      const companion = {
        slug: server.slug,
        name: server.name,
        role: server.role,
        image: server.image,
        tag: selected.tag, // mirror the user-chosen tag
        hostPort: server.defaultHostPort,
        containerPort: server.containerPort,
        containerName: server.containerName,
        requiresServer: false,
        envDefaults: server.envDefaults,
      };
      const companionEnv: Record<string, string> = {
        ASPNETCORE_ENVIRONMENT: "Production",
      };
      for (const e of server.envDefaults) {
        if (e.required) companionEnv[e.key] = e.value || "${" + e.key + "}";
      }
      // Reuse infra-derived envs from the main map (DB, broker, etc.).
      for (const [k, v] of Object.entries(envForElsa)) {
        if (k.startsWith("ConnectionStrings__") || k.startsWith("Elsa__")) {
          companionEnv[k] = v;
        }
      }
      lines.push("");
      lines.push(
        ...buildAppService({
          image: companion,
          envForElsa: companionEnv,
          dependsOn,
          isCompanion: false,
        }),
      );
    }
  }

  for (const block of sidecarBlocks) {
    lines.push("");
    lines.push(block);
  }

  if (volumes.size > 0) {
    lines.push("");
    lines.push("volumes:");
    for (const v of volumes) lines.push(`  ${v}:`);
  }

  return { content: lines.join("\n") + "\n", envForElsa };
}

function buildEnvExample(ctx: Ctx, _envForElsa: Record<string, string>): string {
  const out: string[] = [
    "# Environment variables for your Elsa deployment.",
    "# Replace placeholders with real values before starting the stack.",
    "",
  ];

  for (const sel of ctx.state.infrastructureSelections) {
    const provider = findProvider(ctx.catalog, sel.providerId);
    if (!provider) continue;
    if (sel.strategy === "external-service" || sel.strategy === "managed") {
      out.push(`# ${provider.displayName} (${sel.strategy})`);
      for (const output of provider.outputs) {
        const v = (sel.settings ?? {})[output];
        const envVar = defaultEnvForOutput(provider, output);
        out.push(`${envVar}=${typeof v === "string" ? v : ""}`);
      }
      out.push("");
    }
  }

  for (const sp of ctx.state.selectedPackages) {
    const pkg = findPackage(ctx.catalog, sp.packageId);
    if (!pkg) continue;
    for (const featureId of sp.selectedFeatures) {
      const feature = findFeature(pkg, featureId);
      if (!feature) continue;
      for (const setting of feature.settings) {
        if (!setting.envHint) continue;
        out.push(`# ${feature.displayName} · ${setting.displayName}`);
        const v = sp.settings[featureId]?.[setting.name];
        out.push(
          `${envName([setting.envHint])}=${typeof v === "string" ? v : ""}`,
        );
        out.push("");
      }
    }
  }

  if (out.length <= 3) {
    return "# No environment variables required for the current selection.\n";
  }
  return out.join("\n");
}

function buildPackagesLock(ctx: Ctx): string {
  const packages = ctx.state.selectedPackages.map((sp) => {
    const pkg = findPackage(ctx.catalog, sp.packageId);
    return {
      id: sp.packageId,
      version: sp.version,
      features: sp.selectedFeatures,
      stability: pkg?.stability,
      licenseTier: pkg?.licenseTier,
    };
  });
  return JSON.stringify(
    {
      schemaVersion: 2,
      generatedAt: new Date().toISOString(),
      packages,
      packageSources: ctx.state.packageSources
        .filter((s) => s.enabled)
        .map((s) => ({ name: s.name, url: s.url, protocol: s.protocol })),
      infrastructure: ctx.state.infrastructureSelections.map((s) => ({
        kind: s.kind,
        providerId: s.providerId,
        strategy: s.strategy,
      })),
    },
    null,
    2,
  );
}

function buildReadme(ctx: Ctx): string {
  const pkgs = ctx.state.selectedPackages.map((sp) => {
    const pkg = findPackage(ctx.catalog, sp.packageId);
    const features = sp.selectedFeatures
      .map((id) => findFeature(pkg, id)?.displayName ?? id)
      .map((f) => `  - ${f}`);
    return `- **${pkg?.displayName ?? sp.packageId}** \`${sp.version}\`\n${features.join("\n")}`;
  });

  const infra = ctx.state.infrastructureSelections.map((sel) => {
    const provider = findProvider(ctx.catalog, sel.providerId);
    return `- **${prettyKind(sel.kind)}** → ${provider?.displayName ?? "(none)"} · _${sel.strategy}_`;
  });

  return `# Elsa deployment bundle (preview)

Generated by the [Elsa Runtime Builder](https://elsa-workflows.io/elsa-plus/runtime-builder).
This bundle is a starting point — review and adjust before shipping to production.

## Packages

${pkgs.length ? pkgs.join("\n") : "_No packages selected._"}

## Infrastructure

${infra.length ? infra.join("\n") : "_No infrastructure selected._"}

## Files in this bundle

- \`appsettings.Generated.json\` — application settings consumed by Elsa.
- \`Program.Generated.cs\` — illustrative wire-up for the runtime.
- \`packages.lock.json\` — resolved package selection and infrastructure choices.
- \`docker-compose.yml\` — local-friendly Compose stack.
- \`.env.example\` — environment variables to fill in.

## Quick start

\`\`\`bash
cp .env.example .env
# Fill in values, then:
docker compose up -d
\`\`\`

The Elsa API is exposed on http://localhost:5000.
`;
}

function prettyKind(kind: InfraKind): string {
  return kind.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function generateBundleFilesV2(
  state: BuilderStateV2,
  catalog: CatalogV2,
): LegacyGeneratedFile[] {
  const ctx: Ctx = { state, catalog };
  const compose = buildDockerCompose(ctx);
  return [
    {
      path: "appsettings.Generated.json",
      language: "json",
      contents: buildAppSettings(ctx),
    },
    {
      path: "Program.Generated.cs",
      language: "text",
      contents: buildProgramCs(ctx),
    },
    {
      path: "packages.lock.json",
      language: "json",
      contents: buildPackagesLock(ctx),
    },
    {
      path: "docker-compose.yml",
      language: "yaml",
      contents: compose.content,
    },
    {
      path: ".env.example",
      language: "ini",
      contents: buildEnvExample(ctx, compose.envForElsa),
    },
    {
      path: "README.md",
      language: "markdown",
      contents: buildReadme(ctx),
    },
  ];
}

// Backwards-compatible alias to keep imports stable.
export const generateBundleFiles = generateBundleFilesV2;
