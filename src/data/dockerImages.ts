import { Container, LayoutDashboard, type LucideIcon } from "lucide-react";

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
};

const serverRunCommand = `docker run -d \\
  --network elsa \\
  -p 8080:8080 \\
  -e CShells__Shells__0__Features__DefaultAdminUser__AdminUsername=admin \\
  -e CShells__Shells__0__Features__DefaultAdminUser__AdminPassword=YourSecurePassword123! \\
  -e CShells__Shells__0__Features__Identity__SigningKey=replace-with-256-bit-key \\
  --name elsa-server \\
  valenceworks/elsa-pro-server:latest`;

const serverComposeService = `  elsa-server:
    image: valenceworks/elsa-pro-server:latest
    ports:
      - "8080:8080"
    environment:
      CShells__Shells__0__Features__DefaultAdminUser__AdminUsername: admin
      CShells__Shells__0__Features__DefaultAdminUser__AdminPassword: YourSecurePassword123!
      CShells__Shells__0__Features__Identity__SigningKey: replace-with-256-bit-key
    volumes:
      - ./config/elsa-server/config.json:/config/config.json
    networks: [elsa]`;

const studioRunCommand = `docker run -d \\
  --network elsa \\
  -p 8081:8080 \\
  -e Backend__Url=http://elsa-server:8080/elsa/api \\
  --name elsa-studio \\
  valenceworks/elsa-pro-studio-blazorserver:latest`;

const studioComposeService = `  elsa-studio:
    image: valenceworks/elsa-pro-studio-blazorserver:latest
    ports:
      - "8081:8080"
    environment:
      Backend__Url: http://elsa-server:8080/elsa/api
    depends_on: [elsa-server]
    networks: [elsa]`;

export const dockerImages: DockerImage[] = [
  {
    slug: "elsa-pro-server",
    name: "Elsa Pro Server",
    tagline: "Production-oriented Elsa workflow runtime and management API.",
    description:
      "The Elsa 3.8 preview workflow runtime and management API, packaged as a hardened container built on .NET 10. Configure features per shell with CShells, load NuGet packages at startup with Nuplane, and supply settings via a mounted config.json.",
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
    accessUrl: "http://localhost:8080",
    healthUrl: "http://localhost:8080/health",
    envVars: [
      {
        key: "CShells__Shells__0__Features__DefaultAdminUser__AdminUsername",
        description: "Default shell admin username.",
        required: true,
        example: "admin",
      },
      {
        key: "CShells__Shells__0__Features__DefaultAdminUser__AdminPassword",
        description: "Default shell admin password.",
        required: true,
        example: "YourSecurePassword123!",
      },
      {
        key: "CShells__Shells__0__Features__Identity__SigningKey",
        description: "Identity signing key for the default shell. Use a secure 256-bit value in production.",
        required: true,
      },
      {
        key: "Elsa__Cors__AllowedOrigins__0",
        description: "First allowed CORS origin. Use specific trusted domains in production.",
      },
      {
        key: "ASPNETCORE_ENVIRONMENT",
        description: "ASP.NET Core environment. Defaults to Production.",
      },
    ],
    runCommand: serverRunCommand,
    composeService: serverComposeService,
    dockerHubUrl: "https://hub.docker.com/r/valenceworks/elsa-pro-server",
    showPerShellAdmin: true,
    showNuplane: true,
  },
  {
    slug: "elsa-pro-studio-blazorserver",
    name: "Elsa Pro Studio (Blazor Server)",
    tagline: "Visual workflow designer that connects to an Elsa Pro Server.",
    description:
      "The Blazor Server build of Elsa Studio for designing and managing workflows in the browser. Point it at a running Elsa Pro Server via the Backend__Url environment variable.",
    image: "valenceworks/elsa-pro-studio-blazorserver",
    icon: LayoutDashboard,
    tags: ["Studio", "Blazor Server", "Early Preview", "Free"],
    highlights: [
      "Browser-based visual designer",
      "Connects to Elsa Pro Server",
      "Same config.json mount pattern",
    ],
    defaultPort: 8080,
    hostPort: 8081,
    containerName: "elsa-studio",
    needsSharedNetwork: true,
    accessUrl: "http://localhost:8081",
    envVars: [
      {
        key: "Backend__Url",
        description:
          "Elsa Pro Server API URL. Use the server container name on the Docker network (e.g. http://elsa-server:8080/elsa/api).",
        required: true,
        example: "http://elsa-server:8080/elsa/api",
      },
    ],
    runCommand: studioRunCommand,
    composeService: studioComposeService,
    notes: [
      "Studio reaches the server by container name on the shared Docker network — not via localhost.",
      "Open Studio from the host at http://localhost:8081.",
    ],
    dockerHubUrl: "https://hub.docker.com/r/valenceworks/elsa-pro-studio-blazorserver",
  },
];

export function getDockerImage(slug: string): DockerImage | undefined {
  return dockerImages.find((img) => img.slug === slug);
}
