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

// Canonical quick-start Docker commands.
// Source: release/3.7.0/README.md:31-35
export const ELSA_DOCKER_PULL_COMMAND =
  "docker pull elsaworkflows/elsa-server-and-studio-v3:latest";

export const ELSA_DOCKER_RUN_COMMAND = `docker run -t -i -e ASPNETCORE_ENVIRONMENT='Development' -e HTTP_PORTS=8080 -e HTTP__BASEURL=http://localhost:13000 -p 13000:8080 elsaworkflows/elsa-server-and-studio-v3:latest`;

export const ELSA_DOCKER_QUICKSTART = `${ELSA_DOCKER_PULL_COMMAND}\n${ELSA_DOCKER_RUN_COMMAND}`;

export const ELSA_DOCKER_QUICKSTART_NOTE =
  "Reference application for evaluation and development. Not a production-supported distribution.";
