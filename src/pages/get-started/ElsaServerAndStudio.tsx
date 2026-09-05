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
  ELSA_TEMPLATES_VERSION,
  ELSA_RELEASE_LINKS,
  SUPPORTED_DOTNET_SDKS,
  LAST_VERIFIED_ON,
  PACKAGES_CHECKED_ON,
  pkg,
} from "@/data/elsaVersion";

// ---------------------------------------------------------------------------
// Template-based path
// ---------------------------------------------------------------------------
//
// Elsa.Templates ships on its own cadence, separate from the engine. Only
// 3.7.0 and 3.7.1 are published to NuGet.org, and the 3.7.1 template package
// generates projects whose Elsa.* / Elsa.Studio.* references are pinned to
// 3.7.0. Template version and Elsa runtime version are therefore two
// different numbers; the scaffolded solution has to be moved onto
// ELSA_VERSION afterwards.

const installTemplates = `dotnet new install Elsa.Templates::${ELSA_TEMPLATES_VERSION}`;

const scaffoldFromTemplate = `dotnet new elsaserverandstudio -n "ElsaServerAndStudio"
cd ElsaServerAndStudio
dotnet restore
dotnet build
dotnet run --project Host`;

const upgradeScaffold = `# The ${ELSA_TEMPLATES_VERSION} template generates Elsa.* / Elsa.Studio.*
# references at 3.7.0. Raise every one of them to ${ELSA_VERSION}.
dotnet list package | grep -i "Elsa"

dotnet list package --format json \\
  | jq -r '.projects[] | .path as $p | .frameworks[].topLevelPackages[]
           | select(.id | startswith("Elsa")) | "\\($p) \\(.id)"' \\
  | while read -r proj id; do
      dotnet add "$proj" package "$id" --version ${ELSA_VERSION}
    done

dotnet restore && dotnet build`;



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
    <TargetFramework>net9.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <RootNamespace>Host</RootNamespace>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Elsa" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Persistence.EFCore" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Persistence.EFCore.Sqlite" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Http" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Identity" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Scheduling" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Workflows.Api" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Expressions.CSharp" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Expressions.JavaScript" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Expressions.Liquid" Version="${ELSA_VERSION}" />

    <PackageReference Include="Elsa.Studio" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Studio.Core.BlazorServer" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Studio.Shell" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Studio.Authentication.ElsaIdentity.BlazorServer" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Studio.Authentication.ElsaIdentity.UI" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Studio.Authentication.UI" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Studio.Authentication.Themes" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Studio.Dashboard" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Studio.Workflows" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Studio.Workflows.Dashboard" Version="${ELSA_VERSION}" />
    <PackageReference Include="Elsa.Studio.Workflows.Designer" Version="${ELSA_VERSION}" />
  </ItemGroup>

</Project>`;

const hostPackagesCli = `# Elsa engine
${pkg("Elsa")}
${pkg("Elsa.Persistence.EFCore")}
${pkg("Elsa.Persistence.EFCore.Sqlite")}
${pkg("Elsa.Http")}
${pkg("Elsa.Identity")}
${pkg("Elsa.Scheduling")}
${pkg("Elsa.Workflows.Api")}
${pkg("Elsa.Expressions.CSharp")}
${pkg("Elsa.Expressions.JavaScript")}
${pkg("Elsa.Expressions.Liquid")}

# Elsa Studio (Blazor Server hosting)
${pkg("Elsa.Studio")}
${pkg("Elsa.Studio.Core.BlazorServer")}
${pkg("Elsa.Studio.Shell")}
${pkg("Elsa.Studio.Authentication.ElsaIdentity.BlazorServer")}
${pkg("Elsa.Studio.Authentication.ElsaIdentity.UI")}
${pkg("Elsa.Studio.Authentication.UI")}
${pkg("Elsa.Studio.Authentication.Themes")}
${pkg("Elsa.Studio.Dashboard")}
${pkg("Elsa.Studio.Workflows")}
${pkg("Elsa.Studio.Workflows.Dashboard")}
${pkg("Elsa.Studio.Workflows.Designer")}`;


// Verified by compiling this exact source (plus Host.csproj and
// Pages/_Host.cshtml below) against the Elsa 3.8.0 packages with .NET SDK
// 9.0.311: build succeeded, and the host serves Studio on "/" while the Elsa
// API answers under its configured route prefix.
const programCs = `using Elsa.Extensions;
using Elsa.Http.Options;
using Elsa.Persistence.EFCore.Extensions;
using Elsa.Persistence.EFCore.Modules.Management;
using Elsa.Persistence.EFCore.Modules.Runtime;
using Elsa.Studio.Authentication.Abstractions.Models;
using Elsa.Studio.Authentication.ElsaIdentity.BlazorServer.Extensions;
using Elsa.Studio.Authentication.ElsaIdentity.HttpMessageHandlers;
using Elsa.Studio.Authentication.ElsaIdentity.UI.Extensions;
using Elsa.Studio.Authentication.Themes.Extensions;
using Elsa.Studio.Authentication.UI.Extensions;
using Elsa.Studio.Authentication.UI.Options;
using Elsa.Studio.Core.BlazorServer.Extensions;
using Elsa.Studio.Dashboard.Extensions;
using Elsa.Studio.Extensions;
using Elsa.Studio.Models;
using Elsa.Studio.Shell.Extensions;
using Elsa.Studio.Workflows.Dashboard.Extensions;
using Elsa.Studio.Workflows.Designer.Extensions;
using Elsa.Studio.Workflows.Extensions;
using Elsa.Workflows.Api;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);
var configuration = builder.Configuration;

// -------------------------------------------------------------------------
// Elsa engine
// -------------------------------------------------------------------------
builder.Services.AddElsa(elsa =>
{
    // Elsa 3.8.0 rejects a missing signing key, a key shorter than 32 ASCII
    // characters, and known public defaults outside Development/Demo.
    // UseDefaultAdmin bootstraps the first admin from values you own.
    elsa.UseIdentity(identity =>
    {
        identity.TokenOptions += options => configuration.GetSection("Identity:Tokens").Bind(options);

        identity.UseDefaultAdmin(admin => admin
            .WithAdminUserName(configuration["Identity:DefaultAdmin:UserName"]!)
            .WithAdminPassword(configuration["Identity:DefaultAdmin:Password"]!)
            .WithAdminRoleName("admin")
            .WithAdminRolePermissions(new List<string> { "*" }));
    });

    elsa.UseDefaultAuthentication();
    elsa.UseWorkflows();
    elsa.UseWorkflowManagement(management => management.UseEntityFrameworkCore(ef => ef.UseSqlite()));
    elsa.UseWorkflowRuntime(runtime => runtime.UseEntityFrameworkCore(ef => ef.UseSqlite()));
    elsa.UseWorkflowsApi();
    elsa.UseScheduling();
    elsa.UseHttp(http => http.ConfigureHttpOptions = options => configuration.GetSection("Http").Bind(options));

    // C# expressions run host code: they need
    // Scripting:CSharp:AllowHostCodeExecution and the
    // exec:csharp-expressions permission. Not a sandbox.
    elsa.UseCSharp(csharp => csharp.CSharpOptions += options => configuration.GetSection("Scripting:CSharp").Bind(options));
    elsa.UseJavaScript();
    elsa.UseLiquid();
});

// -------------------------------------------------------------------------
// Elsa Studio (Blazor Server, hosted in this same app)
// -------------------------------------------------------------------------
builder.Services.AddRazorPages();
builder.Services.AddServerSideBlazor(options =>
{
    options.RootComponents.RegisterCustomElsaStudioElements();
    options.RootComponents.MaxJSRootComponents = 1000;
});

// Studio 3.8.0 requires exactly one authentication provider to be selected.
builder.Services.AddStudioAuthenticationMode(options => options.Provider = StudioAuthenticationProvider.ElsaIdentity);
builder.Services.AddElsaIdentity();
builder.Services.AddElsaIdentityUI();

// Studio talks to the Elsa API over HTTP - here, its own.
var backendApiConfig = new BackendApiConfig
{
    ConfigureBackendOptions = options => configuration.GetSection("Backend").Bind(options),
    ConfigureHttpClientBuilder = options => options.AuthenticationHandler = typeof(ElsaIdentityAuthenticatingApiHttpMessageHandler)
};

builder.Services.AddCore();
builder.Services.AddShell();
// Required. In Studio ${ELSA_VERSION}, AddElsaIdentityUI() only registers the
// Elsa Identity provider and its redirect; the /login page itself lives in
// Elsa.Studio.Authentication.UI and needs AddAuthenticationUI() for its
// feature and services. Without it, /login fails to render. The same call is
// required when you select direct OIDC instead of Elsa Identity.
builder.Services.AddAuthenticationUI(configuration.GetSection(LoginThemeOptions.SectionName)).AddElsaStudioLoginThemes();
builder.Services.AddRemoteBackend(backendApiConfig);
builder.Services.AddDashboardModule(backendApiConfig);
builder.Services.AddWorkflowsModule();
builder.Services.AddWorkflowsDashboardModule();

var app = builder.Build();

// Elsa API, mapped under its configured route prefix (default: elsa/api).
var apiEndpointOptions = app.Services.GetRequiredService<IOptions<ApiEndpointOptions>>().Value;
app.MapWorkflowsApi(apiEndpointOptions.RoutePrefix);

app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.UseJsonSerializationErrorHandler();

// Serves workflows that start with an HTTP Endpoint activity.
app.UseWorkflows();

app.MapBlazorHub();
app.MapFallbackToPage("/_Host");

app.Run();`;

const hostPage = `@page "/"
@using Elsa.Studio.Shell
@using Microsoft.AspNetCore.Components.Web
@namespace Host.Pages
@addTagHelper *, Microsoft.AspNetCore.Mvc.TagHelpers

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <base href="~/" />
    <title>Elsa Server + Studio</title>
    <link href="_content/MudBlazor/MudBlazor.min.css" rel="stylesheet" />
    <link href="_content/CodeBeam.MudBlazor.Extensions/MudExtensions.min.css" rel="stylesheet" />
    <link href="_content/Radzen.Blazor/css/material-base.css" rel="stylesheet" />
    <link href="_content/Elsa.Studio.Shell/css/shell.css" rel="stylesheet" />
    <link href="_content/Elsa.Studio.Workflows.Designer/designer.css" rel="stylesheet" />
    <component type="typeof(HeadOutlet)" render-mode="ServerPrerendered" />
</head>
<body>
<component type="typeof(App)" render-mode="ServerPrerendered" />

<script src="_content/BlazorMonaco/jsInterop.js"></script>
<script src="_content/BlazorMonaco/lib/monaco-editor/min/vs/loader.js"></script>
<script src="_content/BlazorMonaco/lib/monaco-editor/min/vs/editor/editor.main.js"></script>
<script src="_content/MudBlazor/MudBlazor.min.js"></script>
<script src="_content/CodeBeam.MudBlazor.Extensions/MudExtensions.min.js"></script>
<script src="_content/Radzen.Blazor/Radzen.Blazor.js"></script>
<script src="_framework/blazor.server.js"></script>
</body>
</html>`;

const importsRazor = `@using Microsoft.AspNetCore.Components.Routing
@using Microsoft.AspNetCore.Components.Web
@using Microsoft.AspNetCore.Mvc.TagHelpers`;

const appSettingsJson = `{
  "Identity": {
    "DefaultAdmin": {
      "UserName": "admin",
      "Password": "<set-a-strong-bootstrap-password>"
    },
    "Tokens": {
      "SigningKey": "<at least 32 printable ASCII characters, no surrounding whitespace>",
      "AccessTokenLifetime": "1:00:00:00"
    }
  },
  "Scripting": {
    "CSharp": {
      "AllowHostCodeExecution": false
    }
  },
  "Backend": {
    "Url": "https://localhost:5001/elsa/api"
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
mkdir Pages
# Then paste Host.csproj, Program.cs, _Imports.razor,
# Pages/_Host.cshtml, and appsettings.json shown below.`;


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
                <li>
                  <strong>Template package:</strong> <code className="px-1.5 py-0.5 rounded bg-muted font-mono">Elsa.Templates</code>{" "}
                  ships on its own cadence, so template version and Elsa runtime version are two
                  different numbers. Only 3.7.0 and{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono">{ELSA_TEMPLATES_VERSION}</code> are published
                  to NuGet.org, and the {ELSA_TEMPLATES_VERSION} template generates{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono">Elsa.*</code> references at 3.7.0 — so a
                  scaffolded solution must be moved onto {ELSA_VERSION} afterwards.
                </li>
                <li>
                  <strong>Release notes:</strong>{" "}
                  <a className="text-primary hover:underline" href={ELSA_RELEASE_LINKS.core} target="_blank" rel="noopener noreferrer">Elsa Core {ELSA_VERSION}</a>{" "}
                  ·{" "}
                  <a className="text-primary hover:underline" href={ELSA_RELEASE_LINKS.studio} target="_blank" rel="noopener noreferrer">Elsa Studio {ELSA_VERSION}</a>
                  .
                </li>
                <li className="text-muted-foreground">
                  Package versions and registration APIs checked against the tagged{" "}
                  {ELSA_VERSION} sources and NuGet.org on <strong>{PACKAGES_CHECKED_ON}</strong>. Last full
                  clean-room run of this guide: <strong>{LAST_VERIFIED_ON}</strong> (Elsa 3.7.1).
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
                    Pin the template package to its latest published version,{" "}
                    <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">{ELSA_TEMPLATES_VERSION}</code>.
                    There is no {ELSA_VERSION} template package: NuGet.org lists only 3.7.0 and{" "}
                    {ELSA_TEMPLATES_VERSION}.
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
                    Open the URL printed in the terminal and sign in with the development
                    credentials the template writes into its own configuration. Treat them as
                    development-only: replace them before the app leaves your machine.
                  </p>
                </div>
              </StepItem>

              <StepItem
                number={3}
                title={`Move the solution to Elsa ${ELSA_VERSION}`}
                description={
                  <p>
                    Raise every <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">Elsa.*</code> and{" "}
                    <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">Elsa.Studio.*</code> reference to{" "}
                    {ELSA_VERSION}, then apply the identity and scripting changes described below —
                    the scaffolded configuration predates them.
                  </p>
                }
              >
                <CodeBlock
                  code={upgradeScaffold}
                  language="bash"
                  title="Terminal"
                />
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
                title="_Imports.razor and Pages/_Host.cshtml"
                description="Elsa Studio 3.8.0 renders through the Shell's App root component, served from a Razor Pages host page."
              >
                <div className="space-y-4">
                  <CodeBlock
                    code={importsRazor}
                    language="razor"
                    title="Host/_Imports.razor"
                  />
                  <CodeBlock
                    code={hostPage}
                    language="razor"
                    title="Host/Pages/_Host.cshtml"
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
                    Open the URL printed in the terminal and sign in with the credentials you
                    configured under <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">Identity:DefaultAdmin</code>.
                    Elsa {ELSA_VERSION} ships no default admin account: with nothing configured, every
                    sign-in is denied.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Localhost requests no longer receive security-root permissions automatically.
                    A local host that needs that must opt in with{" "}
                    <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">
                      EnableLocalHostPermissionGrantForSecurityRoot()
                    </code>.
                  </p>
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
