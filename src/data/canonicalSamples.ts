// Canonical Elsa 3.7.0 samples shared across the public site.
// Source of truth: https://github.com/elsa-workflows/elsa-core/tree/release/3.7.0
//
// Do not duplicate these strings inline. Import from here so the homepage
// and get-started docs stay in lockstep with the release branch.

// Embedding Elsa in a .NET host.
// Source paths (release/3.7.0):
//   src/modules/Elsa/Extensions/DependencyInjectionExtensions.cs:18   -> AddElsa
//   src/modules/Elsa.Workflows.Core/Extensions/ModuleExtensions.cs:11 -> UseWorkflows
//   src/modules/Elsa.Http/Extensions/ModuleExtensions.cs:15           -> UseHttp
//   src/modules/Elsa.Scheduling/Extensions/ModuleExtensions.cs:18     -> UseScheduling
//   src/apps/Elsa.Server.Web/Program.cs:46-121                        -> integrated module configuration
export const ELSA_EMBED_SNIPPET = `// Program.cs — embed Elsa in your .NET app
services.AddElsa(elsa =>
{
    elsa.UseWorkflows();
    elsa.UseHttp();
    elsa.UseScheduling();
});`;

// Canonical container registries.
// Community images are public on GHCR (no login). Paid images ship from a
// private Azure Container Registry and require `docker login`.
export const COMMUNITY_REGISTRY = "ghcr.io/valence-works";
export const PAID_REGISTRY = "valenceruntimeimages.azurecr.io";

export const PAID_REGISTRY_LOGIN_COMMAND = `docker login ${PAID_REGISTRY}`;

/** Version placeholders. Studio may track a different Elsa version than the server. */
export const ELSA_SERVER_VERSION_PLACEHOLDER = "${ELSA_SERVER_VERSION}";
export const ELSA_STUDIO_VERSION_PLACEHOLDER = "${ELSA_STUDIO_VERSION}";

export const COMMUNITY_IMAGES = {
  server: `${COMMUNITY_REGISTRY}/runtime-ce-server`,
  studio: `${COMMUNITY_REGISTRY}/runtime-ce-studio`,
  combined: `${COMMUNITY_REGISTRY}/runtime-ce-combined`,
} as const;

export const PAID_IMAGES = {
  server: `${PAID_REGISTRY}/runtime-server`,
  studio: `${PAID_REGISTRY}/runtime-studio`,
  combined: `${PAID_REGISTRY}/runtime-combined`,
} as const;

// Combined single-container quick start (Community, public, login-free).
export const ELSA_DOCKER_PULL_COMMAND = `docker pull ${COMMUNITY_IMAGES.combined}:latest`;

export const ELSA_DOCKER_RUN_COMMAND = `docker run -it \\
  -e ASPNETCORE_ENVIRONMENT=Development \\
  -p 13000:8080 \\
  ${COMMUNITY_IMAGES.combined}:latest`;

export const ELSA_DOCKER_QUICKSTART = `${ELSA_DOCKER_PULL_COMMAND}\n${ELSA_DOCKER_RUN_COMMAND}`;

export const ELSA_DOCKER_QUICKSTART_NOTE =
  "Community image — public on GitHub Container Registry, no account and no login required.";

// Separate Server + Studio deployment (Community).
export const ELSA_DOCKER_SERVER_PULL_COMMAND = `docker pull ${COMMUNITY_IMAGES.server}:latest`;

export const ELSA_DOCKER_SERVER_RUN_COMMAND = `docker run -it \\
  --network elsa \\
  -e ASPNETCORE_ENVIRONMENT=Development \\
  -p 13000:8080 \\
  --name elsa-server \\
  ${COMMUNITY_IMAGES.server}:latest`;

export const ELSA_DOCKER_STUDIO_PULL_COMMAND = `docker pull ${COMMUNITY_IMAGES.studio}:latest`;

export const ELSA_DOCKER_STUDIO_RUN_COMMAND = `docker run -it \\
  --network elsa \\
  -e Studio__HostingModel=WebAssembly \\
  -e Studio__Client__Backend__Url=http://localhost:13000/elsa/api \\
  -p 14000:8080 \\
  --name elsa-studio \\
  ${COMMUNITY_IMAGES.studio}:latest`;

// Versioned examples. Server/Combined and Studio use separate placeholders
// because Studio may ship against a different Elsa version.
export const ELSA_DOCKER_VERSIONED_EXAMPLE = `docker pull ${COMMUNITY_IMAGES.server}:${ELSA_SERVER_VERSION_PLACEHOLDER}
docker pull ${COMMUNITY_IMAGES.combined}:${ELSA_SERVER_VERSION_PLACEHOLDER}
docker pull ${COMMUNITY_IMAGES.studio}:${ELSA_STUDIO_VERSION_PLACEHOLDER}`;

