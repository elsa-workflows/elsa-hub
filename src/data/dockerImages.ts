import { Container, LayoutDashboard, Boxes, type LucideIcon } from "lucide-react";

export type DockerImageEnvVar = {
  key: string;
  description: string;
  required?: boolean;
  example?: string;
};

export type DockerImage = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  image: string;
  icon: LucideIcon;
  tags: string[];
  highlights: string[];
  defaultPort: number;
  hostPort: number;
  containerName: string;
  needsSharedNetwork: boolean;
  accessUrl?: string;
  healthUrl?: string;
  envVars: DockerImageEnvVar[];
  runCommand: string;
  composeService: string;
  notes?: string[];
  dockerHubUrl: string;
  // Concept blocks to include on the detail page:
  showPerShellAdmin?: boolean;
  showNuplane?: boolean;
  // When true, the detail page renders a "requires Elsa Pro Server" alert
  // and a server-startup snippet alongside the Studio quick-start.
  requiresServer?: boolean;
  // Optional richer compose example demonstrating Postgres + RabbitMQ alongside this image.
  fullStackComposeFile?: string;
};

const serverRunCommand = `docker run -d \\
  --network elsa \\
  -p 8080:8080 \\
  -e CShells__Shells__Default__Features__DefaultAdminUser__AdminUsername=admin \\
  -e CShells__Shells__Default__Features__DefaultAdminUser__AdminPassword=YourSecurePassword123! \\
  -e CShells__Shells__Default__Features__Identity__SigningKey=replace-with-256-bit-key \\
  -e Elsa__Cors__AllowedOrigins__0=http://localhost:8081 \\
  --name elsa-server \\
  valenceworks/elsa-pro-server:latest`;

const serverComposeService = `  elsa-server:
    image: valenceworks/elsa-pro-server:latest
    ports:
      - "8080:8080"
    environment:
      CShells__Shells__Default__Features__DefaultAdminUser__AdminUsername: admin
      CShells__Shells__Default__Features__DefaultAdminUser__AdminPassword: YourSecurePassword123!
      CShells__Shells__Default__Features__Identity__SigningKey: replace-with-256-bit-key
      Elsa__Cors__AllowedOrigins__0: http://localhost:8081
    volumes:
      - ./config/elsa-server/config.json:/config/config.json
    networks: [elsa]`;

const studioRunCommand = `docker run -d \\
  --network elsa \\
  -p 8081:8080 \\
  -e Studio__HostingModel=WebAssembly \\
  -e Studio__Client__Backend__Url=http://localhost:8080/elsa/api \\
  --name elsa-studio \\
  valenceworks/elsa-pro-studio:latest`;

const studioComposeService = `  elsa-studio:
    image: valenceworks/elsa-pro-studio:latest
    ports:
      - "8081:8080"
    environment:
      Studio__HostingModel: WebAssembly
      Studio__Client__Backend__Url: http://localhost:8080/elsa/api
    volumes:
      - ./config/elsa-studio/config.json:/config/config.json
    depends_on: [elsa-server]
    networks: [elsa]`;

const combinedRunCommand = `docker run -d \\
  -p 8080:8080 \\
  -e CShells__Shells__Default__Features__DefaultAdminUser__AdminUsername=admin \\
  -e CShells__Shells__Default__Features__DefaultAdminUser__AdminPassword=YourSecurePassword123! \\
  -e CShells__Shells__Default__Features__Identity__SigningKey=replace-with-256-bit-key \\
  --name elsa-pro \\
  valenceworks/elsa-pro-combined:latest`;

const combinedComposeService = `  elsa-pro:
    image: valenceworks/elsa-pro-combined:latest
    ports:
      - "8080:8080"
    environment:
      CShells__Shells__Default__Features__DefaultAdminUser__AdminUsername: admin
      CShells__Shells__Default__Features__DefaultAdminUser__AdminPassword: YourSecurePassword123!
      CShells__Shells__Default__Features__Identity__SigningKey: replace-with-256-bit-key
    volumes:
      - ./config/elsa-pro/config.json:/config/config.json
    networks: [elsa]`;

const infraComposeServices = `  postgres:
    image: postgres:latest
    command: -c 'max_connections=2000'
    environment:
      POSTGRES_USER: elsa
      POSTGRES_PASSWORD: elsa
      POSTGRES_DB: elsa
    volumes:
      - postgres-data:/var/lib/postgresql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U elsa -d elsa"]
      interval: 10s
      timeout: 5s
      retries: 5

  rabbitmq:
    image: "rabbitmq:4-management"
    ports:
      - "15672:15672"
      - "5672:5672"
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5`;

const serverFullStackCompose = `services:

${infraComposeServices}

  elsa-server:
    image: valenceworks/elsa-pro-server:latest
    ports:
      - "8080:8080"
    environment:
      CShells__Shells__Default__Features__DefaultAdminUser__AdminUsername: admin
      CShells__Shells__Default__Features__DefaultAdminUser__AdminPassword: YourSecurePassword123!
      CShells__Shells__Default__Features__Identity__SigningKey: replace-with-256-bit-key
      Elsa__Cors__AllowedOrigins__0: http://localhost:8081
      # Reference these connection strings from your config.json
      ConnectionStrings__Postgres: "Host=postgres;Port=5432;Database=elsa;Username=elsa;Password=elsa"
      ConnectionStrings__RabbitMq: "amqp://guest:guest@rabbitmq:5672"
    volumes:
      - ./config/elsa-server/config.json:/config/config.json
    depends_on:
      postgres:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    networks: [elsa]

volumes:
  postgres-data:

networks:
  elsa:`;

const combinedFullStackCompose = `services:

${infraComposeServices}

  elsa-pro:
    image: valenceworks/elsa-pro-combined:latest
    ports:
      - "8080:8080"
    environment:
      CShells__Shells__Default__Features__DefaultAdminUser__AdminUsername: admin
      CShells__Shells__Default__Features__DefaultAdminUser__AdminPassword: YourSecurePassword123!
      CShells__Shells__Default__Features__Identity__SigningKey: replace-with-256-bit-key
      # Reference these connection strings from your config.json
      ConnectionStrings__Postgres: "Host=postgres;Port=5432;Database=elsa;Username=elsa;Password=elsa"
      ConnectionStrings__RabbitMq: "amqp://guest:guest@rabbitmq:5672"
    volumes:
      - ./config/elsa-pro/config.json:/config/config.json
    depends_on:
      postgres:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy

volumes:
  postgres-data:`;

export const dockerImages: DockerImage[] = [
  {
    slug: "elsa-pro-server",
    name: "Elsa Pro Server",
    tagline: "Backend-only Elsa workflow runtime and management API.",
    description:
      "The Elsa 3.8 preview workflow runtime and management API, packaged as a hardened container built on .NET 10. Use this image when you want to deploy or scale the API independently of Studio. Configure features per shell with `CShells`, load NuGet packages at startup with `Nuplane`, and supply settings via a mounted `config.json`.",
    image: "valenceworks/elsa-pro-server",
    icon: Container,
    tags: ["Server", "Early Preview", "Free"],
    highlights: [
      "Workflow runtime + management APIs",
      "CShells multi-shell architecture",
      "Nuplane runtime plugin loading",
    ],
    defaultPort: 8080,
    hostPort: 8080,
    containerName: "elsa-server",
    needsSharedNetwork: true,
    accessUrl: "http://localhost:8080/elsa/api",
    healthUrl: "http://localhost:8080/health",
    envVars: [
      {
        key: "CShells__Shells__Default__Features__DefaultAdminUser__AdminUsername",
        description: "Default shell admin username.",
        required: true,
        example: "admin",
      },
      {
        key: "CShells__Shells__Default__Features__DefaultAdminUser__AdminPassword",
        description: "Default shell admin password.",
        required: true,
        example: "YourSecurePassword123!",
      },
      {
        key: "CShells__Shells__Default__Features__Identity__SigningKey",
        description: "Identity signing key for the default shell. Use a secure 256-bit value in production.",
        required: true,
      },
      {
        key: "Elsa__Cors__AllowedOrigins__0",
        description: "First allowed CORS origin. Set to the Studio origin (e.g. http://localhost:8081) when Studio runs separately.",
      },
      {
        key: "ASPNETCORE_ENVIRONMENT",
        description: "ASP.NET Core environment. Defaults to Production.",
      },
    ],
    runCommand: serverRunCommand,
    composeService: serverComposeService,
    dockerHubUrl: "https://hub.docker.com/r/valenceworks/elsa-pro-server",
    fullStackComposeFile: serverFullStackCompose,
    showPerShellAdmin: true,
    showNuplane: true,
  },
  {
    slug: "elsa-pro-studio",
    name: "Elsa Pro Studio",
    tagline: "Visual workflow designer — requires a running Elsa Pro Server.",
    description:
      "The standalone Elsa Studio UI for designing and managing workflows in the browser. A single image now serves both hosting models — switch between Blazor WebAssembly (default) and Blazor Server with the `Studio__HostingModel` environment variable. Point it at your server via `Studio__Client__Backend__Url` (WebAssembly) or `Backend__Url` (Blazor Server).",
    image: "valenceworks/elsa-pro-studio",
    icon: LayoutDashboard,
    tags: ["Studio", "WebAssembly / Server", "Early Preview", "Free"],
    highlights: [
      "Browser-based visual designer",
      "Blazor WebAssembly or Blazor Server via one config flag",
      "Connects to any Elsa Pro Server",
    ],
    defaultPort: 8080,
    hostPort: 8081,
    containerName: "elsa-studio",
    needsSharedNetwork: true,
    accessUrl: "http://localhost:8081",
    envVars: [
      {
        key: "Studio__HostingModel",
        description: "Studio hosting model: WebAssembly (default) or BlazorServer.",
        example: "WebAssembly",
      },
      {
        key: "Studio__Client__Backend__Url",
        description:
          "Browser-visible Elsa API URL for WebAssembly Studio. Must be reachable from the user's browser.",
        required: true,
        example: "http://localhost:8080/elsa/api",
      },
      {
        key: "Backend__Url",
        description:
          "Server-side Elsa API URL for Blazor Server Studio. Use the server container name on the shared Docker network (e.g. http://elsa-server:8080/elsa/api).",
        example: "http://elsa-server:8080/elsa/api",
      },
    ],
    runCommand: studioRunCommand,
    composeService: studioComposeService,
    notes: [
      "WebAssembly mode: the browser calls the API directly, so Studio__Client__Backend__Url must be reachable from the browser. Configure CORS on the server (Elsa__Cors__AllowedOrigins__0) when Studio and API are on different origins.",
      "Blazor Server mode: the Studio container calls the API from inside the Docker network, so Backend__Url should use the server container name (e.g. http://elsa-server:8080/elsa/api).",
      "Open Studio from the host at http://localhost:8081.",
    ],
    dockerHubUrl: "https://hub.docker.com/r/valenceworks/elsa-pro-studio",
    requiresServer: true,
  },
  {
    slug: "elsa-pro-combined",
    name: "Elsa Pro Combined",
    tagline: "Server + Studio in a single container, served from one origin.",
    description:
      "A single-container deployment that hosts both the Elsa workflow API and the Studio UI in one process. Studio is served at the root and the API at `/elsa/api` on the same origin — ideal for single-host deployments, demos, and self-contained appliances. Studio defaults to Blazor WebAssembly and can be switched to Blazor Server via `Studio__HostingModel`.",
    image: "valenceworks/elsa-pro-combined",
    icon: Boxes,
    tags: ["Server + Studio", "Single container", "Early Preview", "Free"],
    highlights: [
      "API + Studio in one image",
      "One origin, no CORS to configure",
      "WebAssembly or Blazor Server hosting",
    ],
    defaultPort: 8080,
    hostPort: 8080,
    containerName: "elsa-pro",
    needsSharedNetwork: false,
    accessUrl: "http://localhost:8080",
    healthUrl: "http://localhost:8080/health",
    envVars: [
      {
        key: "CShells__Shells__Default__Features__DefaultAdminUser__AdminUsername",
        description: "Default shell admin username.",
        required: true,
        example: "admin",
      },
      {
        key: "CShells__Shells__Default__Features__DefaultAdminUser__AdminPassword",
        description: "Default shell admin password.",
        required: true,
        example: "YourSecurePassword123!",
      },
      {
        key: "CShells__Shells__Default__Features__Identity__SigningKey",
        description: "Identity signing key for the default shell. Use a secure 256-bit value in production.",
        required: true,
      },
      {
        key: "Studio__HostingModel",
        description: "Studio hosting model: WebAssembly (default) or BlazorServer.",
        example: "WebAssembly",
      },
      {
        key: "Backend__Url",
        description: "Required when running Studio in Blazor Server mode. Set to http://localhost:8080/elsa/api.",
        example: "http://localhost:8080/elsa/api",
      },
      {
        key: "ASPNETCORE_ENVIRONMENT",
        description: "ASP.NET Core environment. Defaults to Production.",
      },
    ],
    runCommand: combinedRunCommand,
    composeService: combinedComposeService,
    notes: [
      "Open Studio at http://localhost:8080 — the API is available at http://localhost:8080/elsa/api on the same origin.",
      "Because Studio and API share an origin, no CORS configuration is required.",
    ],
    dockerHubUrl: "https://hub.docker.com/r/valenceworks/elsa-pro-combined",
    showPerShellAdmin: true,
    showNuplane: true,
  },
];

export function getDockerImage(slug: string): DockerImage | undefined {
  return dockerImages.find((img) => img.slug === slug);
}
