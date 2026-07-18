import { Seo } from "@/components/Seo";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BookOpen, ExternalLink, Sparkles, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  CodeBlock,
  StepItem,
  PrerequisitesBox,
  GuideBreadcrumb,
  GuideNavigation,
} from "@/components/get-started";
import {
  ELSA_VERSION,
  SUPPORTED_DOTNET_SDKS,
  LAST_VERIFIED_ON,
  pkg,
} from "@/data/elsaVersion";

// ---------------------------------------------------------------------------
// Template-based (recommended) path
// ---------------------------------------------------------------------------

const installTemplates = `dotnet new install Elsa.Templates::${ELSA_VERSION}`;

const scaffoldFromTemplate = `dotnet new elsaserverandstudio -n "ElsaServerAndStudio"
cd ElsaServerAndStudio
dotnet restore
dotnet build
dotnet run --project Host`;

// ---------------------------------------------------------------------------
// Manual setup — Blazor Server hosting model
// ---------------------------------------------------------------------------
//
// The manual walkthrough uses a Blazor Server host that runs both the Elsa
// engine and the Elsa Studio UI in a single process. This is the simplest
// coherent setup: it avoids the WASM client / server-host package split
// that no longer exists on NuGet.

const hostCsproj = `<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Elsa" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Persistence.EFCore" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Persistence.EFCore.Sqlite" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Identity" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Scheduling" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Workflows.Api" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Expressions.CSharp" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Expressions.JavaScript" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Expressions.Liquid" Version="${ELSA_VERSION}" />

    <PackageReference Include="Elsa.Studio" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Studio.Core" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Studio.Shell" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Studio.Login" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Studio.Workflows" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Studio.Workflows.Designer" Version="${ELSA_VERSION}" />
  </ItemGroup>

</Project>`;

const hostPackagesCli = `# Elsa engine
${pkg("Elsa")}
${pkg("Elsa.Persistence.EFCore")}
${pkg("Elsa.Persistence.EFCore.Sqlite")}
${pkg("Elsa.Identity")}
${pkg("Elsa.Scheduling")}
${pkg("Elsa.Workflows.Api")}
${pkg("Elsa.Expressions.CSharp")}
${pkg("Elsa.Expressions.JavaScript")}
${pkg("Elsa.Expressions.Liquid")}

# Elsa Studio (Blazor Server hosting)
${pkg("Elsa.Studio")}
${pkg("Elsa.Studio.Core")}
${pkg("Elsa.Studio.Shell")}
${pkg("Elsa.Studio.Login")}
${pkg("Elsa.Studio.Workflows")}
${pkg("Elsa.Studio.Workflows.Designer")}`;

const programCs = `using Elsa.Extensions;
using Elsa.Persistence.EFCore.Extensions;
using Elsa.Persistence.EFCore.Modules.Management;
using Elsa.Persistence.EFCore.Modules.Runtime;
using Elsa.Studio.Extensions;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

// -------------------------------------------------------------------------
// Elsa engine
// -------------------------------------------------------------------------
builder.Services.AddElsa(elsa =>
{
    elsa.UseWorkflowManagement(m =>
        m.UseEntityFrameworkCore(ef => ef.UseSqlite()));

    elsa.UseWorkflowRuntime(r =>
        r.UseEntityFrameworkCore(ef => ef.UseSqlite()));

    elsa.UseIdentity(identity =>
    {
        identity.UseAdminUserProvider();
        identity.TokenOptions = options =>
        {
            options.SigningKey = config["Identity:SigningKey"]!;
            options.AccessTokenLifetime = TimeSpan.FromDays(1);
        };
    });

    elsa.UseDefaultAuthentication();
    elsa.UseWorkflowsApi();
    elsa.UseScheduling();
    elsa.UseCSharp();
    elsa.UseJavaScript();
    elsa.UseLiquid();
});

// -------------------------------------------------------------------------
// Elsa Studio (hosted in this same Blazor Server app)
// -------------------------------------------------------------------------
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

builder.Services.AddCore();
builder.Services.AddShell();
builder.Services.AddLoginModule();
builder.Services.AddWorkflowsModule();

// Point Studio at the local Elsa API mounted below.
builder.Services.AddLocalBackend(config.GetSection("Backend"));

var app = builder.Build();

app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.UseWorkflowsApi();

app.MapRazorComponents<Host.Components.App>()
    .AddInteractiveServerRenderMode();

app.Run();`;

const appRazor = `@using Elsa.Studio.Shell.Components

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <base href="/" />
    <title>Elsa Server + Studio</title>
    <link href="_content/MudBlazor/MudBlazor.min.css" rel="stylesheet" />
    <link href="_content/Elsa.Studio.Shell/css/shell.css" rel="stylesheet" />
    <HeadOutlet @rendermode="InteractiveServer" />
</head>
<body>
    <Routes @rendermode="InteractiveServer" />
    <script src="_framework/blazor.web.js"></script>
    <script src="_content/MudBlazor/MudBlazor.min.js"></script>
</body>
</html>`;

const routesRazor = `@using Elsa.Studio.Shell.Components

<ElsaRoutes />`;

const appSettingsJson = `{
  "Identity": {
    "SigningKey": "replace-with-a-long-256-bit-secret"
  },
  "Backend": {
    "Url": "/elsa/api"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  }
}`;

const solutionScaffold = `mkdir ElsaServerAndStudio && cd ElsaServerAndStudio
dotnet new sln
dotnet new web -n Host
dotnet sln add Host
cd Host
mkdir Components
# Then paste Host.csproj, Program.cs, Components/App.razor,
# Components/Routes.razor, and appsettings.json shown below.`;

const buildRun = `# From the solution root
dotnet restore
dotnet build
dotnet run --project Host`;

export default function ElsaServerAndStudio() {
  return (
    <Layout>
      <Seo
        path="/get-started/elsa-server-and-studio"
        title={`Elsa Server + Studio (Elsa ${ELSA_VERSION})`}
        description={`Run Elsa Server and Elsa Studio in a single Blazor Server app, pinned to Elsa ${ELSA_VERSION}.`}
      />
      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container">
          <div className="mb-6">
            <GuideBreadcrumb currentPage="Server + Studio" />
          </div>
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <h1 className="text-4xl md:text-5xl font-bold">
                Set Up Elsa Server + Studio
              </h1>
              <Badge className="gap-1">
                <Sparkles className="h-3 w-3" />
                Recommended
              </Badge>
              <Badge variant="outline" className="font-mono">
                Elsa {ELSA_VERSION}
              </Badge>
            </div>
            <p className="text-xl text-muted-foreground">
              Run the workflow engine and the visual designer in a single
              Blazor Server application. Every package on this page is pinned
              to Elsa {ELSA_VERSION}.
            </p>
          </div>
        </div>
      </section>

      {/* Guide Content */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto space-y-16">
            {/* Version compatibility */}
            <div
              id="version-compatibility"
              className="rounded-lg border-2 border-primary/30 bg-primary/5 p-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Version compatibility</h2>
              </div>
              <ul className="text-sm space-y-2">
                <li>
                  <strong>Elsa release:</strong>{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono">
                    {ELSA_VERSION}
                  </code>{" "}
                  — applies to <em>both</em> Elsa and Elsa Studio packages.
                </li>
                <li>
                  <strong>Supported .NET SDKs:</strong>{" "}
                  {SUPPORTED_DOTNET_SDKS.map((v, i) => (
                    <span key={v}>
                      <code className="px-1.5 py-0.5 rounded bg-muted font-mono">
                        {v}
                      </code>
                      {i < SUPPORTED_DOTNET_SDKS.length - 1 ? ", " : ""}
                    </span>
                  ))}
                  .
                </li>
                <li>
                  <strong>Golden rule:</strong> keep every{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono">
                    Elsa.*
                  </code>{" "}
                  and{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono">
                    Elsa.Studio.*
                  </code>{" "}
                  reference on the same release line. Mixing versions across
                  the engine and Studio is not supported.
                </li>
                <li>
                  <strong>Updating the guide:</strong> bump{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono">
                    ELSA_VERSION
                  </code>{" "}
                  in{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono">
                    src/data/elsaVersion.ts
                  </code>
                  , re-run every guide from a clean directory, and update{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono">
                    LAST_VERIFIED_ON
                  </code>
                  .
                </li>
                <li className="text-muted-foreground">
                  Last verified from a clean checkout on{" "}
                  <strong>{LAST_VERIFIED_ON}</strong>.
                </li>
              </ul>
            </div>

            {/* Prerequisites */}
            <PrerequisitesBox
              items={[
                `.NET SDK ${SUPPORTED_DOTNET_SDKS.join(" or ")}`,
                "IDE (Visual Studio, Rider, or VS Code)",
              ]}
            />

            {/* Recommended: template */}
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  Recommended: use the official Elsa template
                </h2>
                <p className="text-muted-foreground">
                  The fastest way to a working Server + Studio app is the
                  official template package. It scaffolds a solution with the
                  exact packages, hosting model, and configuration this guide
                  reproduces manually below.
                </p>
              </div>

              <StepItem
                number={1}
                title="Install the Elsa templates"
                description={
                  <p>
                    Pin the template package to the same release as the runtime
                    packages.
                  </p>
                }
              >
                <CodeBlock
                  code={installTemplates}
                  language="bash"
                  title="Terminal"
                />
              </StepItem>

              <StepItem
                number={2}
                title="Scaffold, build, and run"
                description="Generate the solution and run it from the Host project."
              >
                <CodeBlock
                  code={scaffoldFromTemplate}
                  language="bash"
                  title="Terminal"
                />
                <div className="mt-4 p-4 rounded-lg border bg-muted/30 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Open the URL printed in the terminal and sign in with:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    <li>
                      Username:{" "}
                      <code className="px-1.5 py-0.5 rounded bg-muted font-mono">
                        admin
                      </code>
                    </li>
                    <li>
                      Password:{" "}
                      <code className="px-1.5 py-0.5 rounded bg-muted font-mono">
                        password
                      </code>
                    </li>
                  </ul>
                </div>
              </StepItem>
            </div>

            {/* Manual walkthrough */}
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  Manual setup (equivalent to the template)
                </h2>
                <p className="text-muted-foreground">
                  If you prefer to wire things up by hand, the files below
                  reproduce what the template generates. One Blazor Server
                  project (<code className="font-mono">Host</code>) runs the
                  Elsa engine and hosts Elsa Studio — no separate WASM client,
                  no obsolete{" "}
                  <code className="font-mono">Elsa.Studio.Host.Server</code>{" "}
                  package.
                </p>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Package renames in Elsa 3.x</AlertTitle>
                <AlertDescription>
                  Older guides referenced{" "}
                  <code className="font-mono">Elsa.EntityFrameworkCore*</code>,{" "}
                  <code className="font-mono">Elsa.CSharp</code>,{" "}
                  <code className="font-mono">Elsa.JavaScript</code>, and{" "}
                  <code className="font-mono">Elsa.Liquid</code>. Those IDs are
                  gone. Use{" "}
                  <code className="font-mono">Elsa.Persistence.EFCore*</code>{" "}
                  and the{" "}
                  <code className="font-mono">Elsa.Expressions.*</code> family
                  instead. Studio packages such as{" "}
                  <code className="font-mono">Elsa.Studio.Host.Server</code>,{" "}
                  <code className="font-mono">Elsa.Studio.Shell.BlazorWasm</code>
                  , and{" "}
                  <code className="font-mono">
                    Elsa.Studio.Workflows.Monaco
                  </code>{" "}
                  do not exist on NuGet and are not referenced here.
                </AlertDescription>
              </Alert>

              <StepItem
                number={1}
                title="Create the solution and Host project"
                description="One .NET web project hosts everything."
              >
                <CodeBlock
                  code={solutionScaffold}
                  language="bash"
                  title="Terminal"
                />
              </StepItem>

              <StepItem
                number={2}
                title="Host.csproj"
                description={
                  <p>
                    Replace the generated{" "}
                    <code className="font-mono">Host.csproj</code> with the
                    file below. All Elsa packages are pinned to{" "}
                    <code className="font-mono">{ELSA_VERSION}</code>.
                  </p>
                }
              >
                <CodeBlock
                  code={hostCsproj}
                  language="xml"
                  title="Host/Host.csproj"
                />
                <p className="mt-3 text-sm text-muted-foreground">
                  Prefer the CLI? These commands produce the same references:
                </p>
                <CodeBlock
                  code={hostPackagesCli}
                  language="bash"
                  title="Terminal — equivalent CLI"
                />
              </StepItem>

              <StepItem
                number={3}
                title="Program.cs"
                description="Wire up the Elsa engine and the Blazor Server-hosted Studio in one place."
              >
                <CodeBlock
                  code={programCs}
                  language="csharp"
                  title="Host/Program.cs"
                />
              </StepItem>

              <StepItem
                number={4}
                title="Components/App.razor and Components/Routes.razor"
                description="The Studio shell renders through these two root components."
              >
                <div className="space-y-4">
                  <CodeBlock
                    code={appRazor}
                    language="razor"
                    title="Host/Components/App.razor"
                  />
                  <CodeBlock
                    code={routesRazor}
                    language="razor"
                    title="Host/Components/Routes.razor"
                  />
                </div>
              </StepItem>

              <StepItem
                number={5}
                title="appsettings.json"
                description="Provide the identity signing key and Studio backend URL."
              >
                <CodeBlock
                  code={appSettingsJson}
                  language="json"
                  title="Host/appsettings.json"
                />
              </StepItem>

              <StepItem
                number={6}
                title="Restore, build, run"
                description="Run the clean-room verification the same way we do."
              >
                <CodeBlock code={buildRun} language="bash" title="Terminal" />
                <div className="mt-6 p-4 rounded-lg border bg-muted/30 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Open the URL printed in the terminal and sign in with:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    <li>
                      Username:{" "}
                      <code className="px-1.5 py-0.5 rounded bg-muted font-mono">
                        admin
                      </code>
                    </li>
                    <li>
                      Password:{" "}
                      <code className="px-1.5 py-0.5 rounded bg-muted font-mono">
                        password
                      </code>
                    </li>
                  </ul>
                </div>
              </StepItem>
            </div>

            {/* Next Steps */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Next Steps</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-auto p-4 justify-start"
                  asChild
                >
                  <a
                    href="https://docs.elsaworkflows.io/application-types/elsa-server-+-studio-wasm"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <BookOpen className="h-5 w-5 mr-3 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">Full Documentation</p>
                      <p className="text-sm text-muted-foreground">
                        Production deployment
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 ml-auto" />
                  </a>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-4 justify-start"
                  asChild
                >
                  <a
                    href="https://github.com/elsa-workflows/elsa-samples"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Sparkles className="h-5 w-5 mr-3 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">Sample Projects</p>
                      <p className="text-sm text-muted-foreground">
                        Real-world examples
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 ml-auto" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Navigation */}
            <GuideNavigation
              prevHref="/get-started/elsa-studio"
              prevLabel="Back to Elsa Studio"
            />
          </div>
        </div>
      </section>
    </Layout>
  );
}
