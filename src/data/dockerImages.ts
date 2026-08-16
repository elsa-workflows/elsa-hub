import { Container, LayoutDashboard, Boxes, type LucideIcon } from "lucide-react";
import runtimeServerArtwork from "@/assets/runtime-server-artwork.png.asset.json";
import runtimeStudioArtwork from "@/assets/runtime-studio-artwork.png.asset.json";
import runtimeCombinedArtwork from "@/assets/runtime-combined-artwork.png.asset.json";


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
  /** Paid counterpart in the private Azure Container Registry. */
  paidImage: string;
  icon: LucideIcon;
  /** Cassette product artwork (CDN url). Omit until the asset is available. */
  artwork?: string;
  artworkAlt?: string;
  artworkLabel?: string;
  artworkVariant?: string;
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
  registryUrl: string;
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
  ghcr.io/valence-works/runtime-ce-server:latest`;

const serverComposeService = `  elsa-server:
    image: ghcr.io/valence-works/runtime-ce-server:latest
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
  ghcr.io/valence-works/runtime-ce-studio:latest`;

const studioComposeService = `  elsa-studio:
    image: ghcr.io/valence-works/runtime-ce-studio:latest
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
  ghcr.io/valence-works/runtime-ce-combined:latest`;

const combinedComposeService = `  elsa-pro:
    image: ghcr.io/valence-works/runtime-ce-combined:latest
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
    image: ghcr.io/valence-works/runtime-ce-server:latest
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
    image: ghcr.io/valence-works/runtime-ce-combined:latest
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
    slug: "runtime-server",
    name: "Valence Runtime Server",
    tagline: "Backend-only Elsa workflow runtime and management API.",
    description:
      "The Elsa 3.8 preview workflow runtime and management API, packaged as a hardened container built on .NET 10. Use this image when you want to deploy or scale the API independently of Studio. Configure features per shell with `CShells`, load NuGet packages at startup with `Nuplane`, and supply settings via a mounted `config.json`.",
    image: "ghcr.io/valence-works/runtime-ce-server",
    paidImage: "valenceruntimeimages.azurecr.io/runtime-server",
    icon: Container,
    artwork: runtimeServerArtwork.url,
    artworkAlt: "Valence Runtime Server container image",
    artworkLabel: "RUNTIME SERVER",
    artworkVariant: "server",

    tags: ["Server", "Early Preview", "Free Community image"],
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
        key: "ASPNETCORE_ENVIRONMENT",
        description: "ASP.NET Core environment. Defaults to Production.",
      },
    ],
    runCommand: serverRunCommand,
    composeService: serverComposeService,
    registryUrl: "https://github.com/valence-works/runtime",
    fullStackComposeFile: serverFullStackCompose,
    showPerShellAdmin: true,
    showNuplane: true,
  },
  {
    slug: "runtime-studio",
    name: "Valence Runtime Studio",
    tagline: "Visual workflow designer — requires a running Valence Runtime Server.",
    description:
      "The standalone Elsa Studio UI for designing and managing workflows in the browser. A single image now serves both hosting models — switch between Blazor WebAssembly (default) and Blazor Server with the `Studio__HostingModel` environment variable. Point it at your server via `Studio__Client__Backend__Url` (WebAssembly) or `Backend__Url` (Blazor Server).",
    image: "ghcr.io/valence-works/runtime-ce-studio",
    paidImage: "valenceruntimeimages.azurecr.io/runtime-studio",
    icon: LayoutDashboard,
    artwork: runtimeStudioArtwork.url,
    artworkAlt: "Valence Runtime Studio container image",
    artworkLabel: "RUNTIME STUDIO",
    artworkVariant: "studio",

    tags: ["Studio", "WebAssembly / Server", "Early Preview", "Free Community image"],
    highlights: [
      "Browser-based visual designer",
      "Blazor WebAssembly or Blazor Server via one config flag",
      "Connects to any Valence Runtime Server",
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
        description: "Browser-visible Elsa API URL for WebAssembly Studio. Must be reachable from the user's browser.",
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
    registryUrl: "https://github.com/valence-works/runtime",
    requiresServer: true,
  },
  {
    slug: "runtime-combined",
    name: "Valence Runtime Combined",
    tagline: "Server + Studio in a single container, served from one origin.",
    description:
      "A single-container deployment that hosts both the Elsa workflow API and the Studio UI in one process. Studio is served at the root and the API at `/elsa/api` on the same origin — ideal for single-host deployments, demos, and self-contained appliances. Studio defaults to Blazor WebAssembly and can be switched to Blazor Server via `Studio__HostingModel`.",
    image: "ghcr.io/valence-works/runtime-ce-combined",
    paidImage: "valenceruntimeimages.azurecr.io/runtime-combined",
    icon: Boxes,
    artwork: runtimeCombinedArtwork.url,
    artworkAlt: "Valence Runtime Combined container image",
    artworkLabel: "RUNTIME COMBINED",
    artworkVariant: "combined",

    tags: ["Server + Studio", "Single container", "Early Preview", "Free Community image"],
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
        key: "Studio__HostingModel",
        description: "Studio hosting model: WebAssembly (default) or BlazorServer.",
        example: "WebAssembly",
      },
      {
        key: "Backend__Url",
        description:
          "Public URL of the Elsa API as seen by the running container. Must match the host port you publish (defaults to http://localhost:{hostPort}/elsa/api).",
        required: true,
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
    registryUrl: "https://github.com/valence-works/runtime",
    fullStackComposeFile: combinedFullStackCompose,
    showPerShellAdmin: true,
    showNuplane: true,
  },
];


export function getDockerImage(slug: string): DockerImage | undefined {
  return dockerImages.find((img) => img.slug === slug);
}
