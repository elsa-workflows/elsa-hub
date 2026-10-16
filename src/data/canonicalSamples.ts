// Canonical Elsa samples shared across the public site.
// Source of truth: https://github.com/elsa-workflows/elsa-core/tree/3.9.0
// Community Docker images: Docker Hub elsaworkflows/*-v3 at Elsa 3.9.0.
//
// Do not duplicate these strings inline. Import from here so the homepage
// and get-started docs stay in lockstep with the release branch.

import { ELSA_LATEST_STABLE_VERSION } from "./elsaVersion";

// Embedding Elsa in a .NET host.
// Source paths (tag 3.9.0):
//   src/modules/Elsa/Extensions/DependencyInjectionExtensions.cs:18   -> AddElsa
//   src/modules/Elsa.Workflows.Core/Extensions/ModuleExtensions.cs:11 -> UseWorkflows
//   src/modules/Elsa.Http/Extensions/ModuleExtensions.cs:15           -> UseHttp
//   src/modules/Elsa.Scheduling/Extensions/ModuleExtensions.cs:18     -> UseScheduling
//   src/apps/Elsa.Server.Web/Program.cs                               -> integrated module configuration
export const ELSA_EMBED_SNIPPET = `// Program.cs — embed Elsa in your .NET app
services.AddElsa(elsa =>
{
    elsa.UseWorkflows();
    elsa.UseHttp();
    elsa.UseScheduling();
});`;

// Canonical container registries.
// Elsa Community images are public on Docker Hub (no login). Elsa Runtime paid
// images ship from a private Azure Container Registry and require `docker login`.
export const COMMUNITY_REGISTRY = "elsaworkflows";
export const PAID_REGISTRY = "valenceruntimeimages.azurecr.io";

export const PAID_REGISTRY_LOGIN_COMMAND = `docker login ${PAID_REGISTRY}`;

/** Pinned Community image tag. Prefer this in copy-paste snippets. */
export const ELSA_COMMUNITY_DOCKER_TAG = ELSA_LATEST_STABLE_VERSION;

/** Floating Community minor tag. Moves when a newer patch on this line ships. */
export const ELSA_COMMUNITY_DOCKER_MINOR_TAG = ELSA_LATEST_STABLE_VERSION.split(".").slice(0, 2).join(".");

/** Elsa 3 Community images (source-built reference hosts on Docker Hub). */
export const COMMUNITY_IMAGES = {
  server: `${COMMUNITY_REGISTRY}/elsa-server-v3`,
  studio: `${COMMUNITY_REGISTRY}/elsa-studio-v3`,
  combined: `${COMMUNITY_REGISTRY}/elsa-server-and-studio-v3`,
} as const;

/**
 * Elsa Apps aliases on Docker Hub. Separate product from Community images;
 * they have not changed with the 3.9.0 Community publish.
 */
export const APPS_IMAGES = {
  server: `${COMMUNITY_REGISTRY}/elsa-server`,
  studio: `${COMMUNITY_REGISTRY}/elsa-studio`,
} as const;

export const PAID_IMAGES = {
  server: `${PAID_REGISTRY}/runtime-server`,
  studio: `${PAID_REGISTRY}/runtime-studio`,
  combined: `${PAID_REGISTRY}/runtime-combined`,
} as const;

// Combined single-container quick start (Community, public, login-free).
export const ELSA_DOCKER_PULL_COMMAND = `docker pull ${COMMUNITY_IMAGES.combined}:${ELSA_COMMUNITY_DOCKER_TAG}`;

export const ELSA_DOCKER_RUN_COMMAND = `docker run -it \\
  -e ASPNETCORE_ENVIRONMENT=Development \\
  -e HTTP_PORTS=8080 \\
  -e HTTP__BASEURL=http://localhost:13000 \\
  -p 13000:8080 \\
  ${COMMUNITY_IMAGES.combined}:${ELSA_COMMUNITY_DOCKER_TAG}`;

export const ELSA_DOCKER_QUICKSTART = `${ELSA_DOCKER_PULL_COMMAND}\n${ELSA_DOCKER_RUN_COMMAND}`;

export const ELSA_DOCKER_QUICKSTART_NOTE =
  `Community image — ${COMMUNITY_IMAGES.combined}:${ELSA_COMMUNITY_DOCKER_TAG} on Docker Hub. Tag ${ELSA_COMMUNITY_DOCKER_MINOR_TAG} follows the 3.9 line; latest moves with the highest stable 3.x.`;

// Separate Server + Studio deployment (Community).
export const ELSA_DOCKER_SERVER_PULL_COMMAND = `docker pull ${COMMUNITY_IMAGES.server}:${ELSA_COMMUNITY_DOCKER_TAG}`;

export const ELSA_DOCKER_SERVER_RUN_COMMAND = `docker run -it \\
  --network elsa \\
  -e ASPNETCORE_ENVIRONMENT=Development \\
  -e HTTP_PORTS=8080 \\
  -e HTTP__BASEURL=http://localhost:13000 \\
  -p 13000:8080 \\
  --name elsa-server \\
  ${COMMUNITY_IMAGES.server}:${ELSA_COMMUNITY_DOCKER_TAG}`;

export const ELSA_DOCKER_STUDIO_PULL_COMMAND = `docker pull ${COMMUNITY_IMAGES.studio}:${ELSA_COMMUNITY_DOCKER_TAG}`;

export const ELSA_DOCKER_STUDIO_RUN_COMMAND = `docker run -it \\
  --network elsa \\
  -e ASPNETCORE_ENVIRONMENT=Development \\
  -e HTTP_PORTS=8080 \\
  -e HTTP__BASEURL=http://localhost:14000 \\
  -e Studio__HostingModel=WebAssembly \\
  -e Studio__Client__Backend__Url=http://localhost:13000/elsa/api \\
  -p 14000:8080 \\
  --name elsa-studio \\
  ${COMMUNITY_IMAGES.studio}:${ELSA_COMMUNITY_DOCKER_TAG}`;

// Pinning examples. Prefer X.Y.Z in copy-paste snippets; X.Y is the floating minor.
export const ELSA_DOCKER_VERSIONED_EXAMPLE = `# Pin a release (preferred)
docker pull ${COMMUNITY_IMAGES.server}:${ELSA_COMMUNITY_DOCKER_TAG}
docker pull ${COMMUNITY_IMAGES.combined}:${ELSA_COMMUNITY_DOCKER_TAG}
docker pull ${COMMUNITY_IMAGES.studio}:${ELSA_COMMUNITY_DOCKER_TAG}

# Follow the ${ELSA_COMMUNITY_DOCKER_MINOR_TAG} minor (moves when a newer ${ELSA_COMMUNITY_DOCKER_MINOR_TAG}.x ships)
docker pull ${COMMUNITY_IMAGES.combined}:${ELSA_COMMUNITY_DOCKER_MINOR_TAG}`;
