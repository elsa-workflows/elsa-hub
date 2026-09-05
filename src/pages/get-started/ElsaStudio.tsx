import { Seo } from "@/components/Seo";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, ExternalLink, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CodeBlock,
  StepItem,
  PrerequisitesBox,
  GuideBreadcrumb,
  GuideNavigation,
} from "@/components/get-started";
import { ELSA_VERSION, pkg } from "@/data/elsaVersion";

const packages = [
  "Elsa.Studio",
  "Elsa.Studio.Core.BlazorWasm",
  "Elsa.Studio.Shell",
  "Elsa.Studio.Authentication.ElsaIdentity.BlazorWasm",
  "Elsa.Studio.Authentication.ElsaIdentity.UI",
  "Elsa.Studio.Authentication.UI",
  "Elsa.Studio.Authentication.Themes",
  "Elsa.Studio.Dashboard",
  "Elsa.Studio.Workflows",
  "Elsa.Studio.Workflows.Dashboard",
  "Elsa.Studio.Workflows.Designer",
]
  .map(pkg)
  .join("\n");

// Verified by compiling this exact source against the Elsa Studio 3.8.0
// packages listed above (.NET SDK 9.0.311): build succeeded, 0 warnings,
// 0 errors.
const programCs = `using Elsa.Studio.Authentication.Abstractions.Models;
using Elsa.Studio.Authentication.ElsaIdentity.BlazorWasm.Extensions;
using Elsa.Studio.Authentication.ElsaIdentity.HttpMessageHandlers;
using Elsa.Studio.Authentication.ElsaIdentity.UI.Extensions;
using Elsa.Studio.Authentication.Themes.Extensions;
using Elsa.Studio.Authentication.UI.Extensions;
using Elsa.Studio.Authentication.UI.Options;
using Elsa.Studio.Contracts;
using Elsa.Studio.Core.BlazorWasm.Extensions;
using Elsa.Studio.Dashboard.Extensions;
using Elsa.Studio.Extensions;
using Elsa.Studio.Models;
using Elsa.Studio.Shell;
using Elsa.Studio.Shell.Extensions;
using Elsa.Studio.Workflows.Dashboard.Extensions;
using Elsa.Studio.Workflows.Designer.Extensions;
using Elsa.Studio.Workflows.Extensions;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
var configuration = builder.Configuration;
var services = builder.Services;

// App comes from Elsa.Studio.Shell - you do not write your own
// App.razor, Routes.razor or MainLayout.razor.
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");
builder.RootComponents.RegisterCustomElsaStudioElements();

// Studio ${ELSA_VERSION} requires exactly one authentication provider.
// This sample signs in against Elsa Identity on your Elsa Server.
services.AddStudioAuthenticationMode(options => options.Provider = StudioAuthenticationProvider.ElsaIdentity);
services.AddElsaIdentity();
services.AddElsaIdentityUI();

var backendApiConfig = new BackendApiConfig
{
    ConfigureBackendOptions = options => configuration.GetSection("Backend").Bind(options),
    ConfigureHttpClientBuilder = options => options.AuthenticationHandler = typeof(ElsaIdentityAuthenticatingApiHttpMessageHandler)
};

services.AddCore();
services.AddShell();
// Required. In Studio ${ELSA_VERSION}, AddElsaIdentityUI() only registers the
// Elsa Identity provider and its redirect; the /login page itself lives in
// Elsa.Studio.Authentication.UI and needs AddAuthenticationUI() for its
// feature and services. Without it, /login fails to render. The same call is
// required when you select direct OIDC instead of Elsa Identity.
services.AddAuthenticationUI(configuration.GetSection(LoginThemeOptions.SectionName)).AddElsaStudioLoginThemes();
services.AddRemoteBackend(backendApiConfig);
// Pass the same BackendApiConfig here. Only this overload registers
// AddRemoteApi<IDashboardApi>(backendApiConfig) with the authenticating
// handler; the parameterless AddDashboardModule() leaves dashboard calls
// unauthenticated and they fail with 401 while the workflow API still works.
services.AddDashboardModule(backendApiConfig);
services.AddWorkflowsModule();
services.AddWorkflowsDashboardModule();

var app = builder.Build();

var startupTaskRunner = app.Services.GetRequiredService<IStartupTaskRunner>();
await startupTaskRunner.RunStartupTasksAsync();

await app.RunAsync();`;

const importsRazor = `@using Microsoft.AspNetCore.Components.Routing
@using Microsoft.AspNetCore.Components.Web`;

const appSettingsJson = `{
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

const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Elsa Studio</title>
    <base href="/" />
    <link href="_content/MudBlazor/MudBlazor.min.css" rel="stylesheet" />
    <link href="_content/CodeBeam.MudBlazor.Extensions/MudExtensions.min.css" rel="stylesheet" />
    <link href="_content/Radzen.Blazor/css/material-base.css" rel="stylesheet" />
    <link href="_content/Elsa.Studio.Shell/css/shell.css" rel="stylesheet" />
</head>
<body>
    <div id="app">
        <div class="loading-splash">
            <h1>Loading Elsa Studio...</h1>
        </div>
    </div>
    <script src="_content/BlazorMonaco/jsInterop.js"></script>
    <script src="_content/BlazorMonaco/lib/monaco-editor/min/vs/loader.js"></script>
    <script src="_content/BlazorMonaco/lib/monaco-editor/min/vs/editor/editor.main.js"></script>
    <script src="_content/MudBlazor/MudBlazor.min.js"></script>
    <script src="_content/CodeBeam.MudBlazor.Extensions/MudExtensions.min.js"></script>
    <script src="_content/Radzen.Blazor/Radzen.Blazor.js"></script>
    <script src="_framework/blazor.webassembly.js"></script>
</body>
</html>`;

const csprojGlobalization = `<PropertyGroup>
  <!-- Required: Elsa Studio switches the culture at startup via
       UseElsaLocalization. Without the full ICU data, Blazor WebAssembly
       throws "Blazor detected a change in the application's culture"
       and the app stops at the loading splash. -->
  <BlazorWebAssemblyLoadAllGlobalizationData>true</BlazorWebAssemblyLoadAllGlobalizationData>
</PropertyGroup>`;

const filesToRemove = `rm -rf Pages
rm -rf Layout
rm App.razor
rm MainLayout.razor`;



export default function ElsaStudio() {
  return (
    <Layout>
      <Seo path="/get-started/elsa-studio" title="Get started with Elsa Studio" description="Run Elsa Studio, the visual designer for Elsa Workflows. Connect it to a running Elsa Server to design and manage workflows." />
      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container">
          <div className="mb-6">
            <GuideBreadcrumb currentPage="Elsa Studio" />
          </div>
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Set Up Elsa Studio
            </h1>
            <p className="text-xl text-muted-foreground">
              Create a Blazor WebAssembly application for visual workflow
              design. Connects to an Elsa Server for workflow management.
            </p>
          </div>
        </div>
      </section>

      {/* Guide Content */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto space-y-16">
            {/* Prerequisites */}
            <PrerequisitesBox
              items={[
                ".NET 8.0 SDK or later",
                "IDE (Visual Studio, Rider, or VS Code)",
                "Running Elsa Server instance",
              ]}
            />

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Dashboard backend required on the server</AlertTitle>
              <AlertDescription>
                This guide registers{" "}
                <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">AddDashboardModule(...)</code>, so
                your Elsa Server must reference{" "}
                <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">Elsa.Dashboard.Api</code> {ELSA_VERSION} and{" "}
                <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">Elsa.Workflows.Runtime.Dashboard</code> {ELSA_VERSION},
                and call{" "}
                <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">elsa.UseDashboardApi()</code> and{" "}
                <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">elsa.UseWorkflowRuntimeDashboard()</code>{" "}
                inside <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">AddElsa(...)</code> (both live in{" "}
                <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">Elsa.Extensions</code>). Without them the
                default dashboard's calls return errors.
              </AlertDescription>
            </Alert>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Server Required</AlertTitle>
              <AlertDescription>
                Elsa Studio requires a running Elsa Server to connect to. If you
                haven't set one up yet,{" "}
                <a
                  href="/get-started/elsa-server"
                  className="text-primary underline underline-offset-4"
                >
                  follow the Elsa Server guide first
                </a>
                .
              </AlertDescription>
            </Alert>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Elsa Studio {ELSA_VERSION}: one authentication provider</AlertTitle>
              <AlertDescription>
                Studio {ELSA_VERSION} consumes Elsa.Api.Client {ELSA_VERSION}, so upgrade the server
                first and keep both on the same release line. Select exactly one authentication
                provider explicitly with{" "}
                <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">
                  AddStudioAuthenticationMode
                </code>{" "}
                — Elsa Identity (used here), direct OIDC, or brokered external authentication.
                Mixing them is not supported. In {ELSA_VERSION},{" "}
                <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">
                  AddElsaIdentityUI()
                </code>{" "}
                only registers the provider and its redirect: the{" "}
                <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">/login</code>{" "}
                page ships in{" "}
                <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">
                  Elsa.Studio.Authentication.UI
                </code>{" "}
                and only renders when you also call{" "}
                <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">
                  AddAuthenticationUI(...)
                </code>
                . That applies to direct OIDC too. Diagnostics and dashboard widgets are opt-in and
                gated by remote features and permissions.
              </AlertDescription>
            </Alert>



            {/* Step 1 */}
            <StepItem
              number={1}
              title="Create a Blazor WebAssembly Project"
              description="Create a new Blazor WebAssembly application."
            >
              <CodeBlock
                code={`dotnet new blazorwasm-empty -n "ElsaStudioBlazorWasm"
cd ElsaStudioBlazorWasm`}
                language="bash"
                title="Terminal"
              />
            </StepItem>

            {/* Step 2 */}
            <StepItem
              number={2}
              title="Add Elsa Studio Packages"
              description="Install the Elsa Studio packages for the workflow designer UI."
            >
              <CodeBlock code={packages} language="bash" title="Terminal" />

              <div className="mt-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Elsa Studio calls{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">UseElsaLocalization</code>{" "}
                  during startup. A default Blazor WebAssembly project ships with trimmed
                  globalization data, so the app aborts at load with{" "}
                  <em>"Blazor detected a change in the application's culture"</em> and never leaves
                  the loading splash. Add the property below to your{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">.csproj</code>{" "}
                  — the build succeeds without it, so this only shows up at runtime.
                </p>
                <CodeBlock
                  code={csprojGlobalization}
                  language="xml"
                  title="ElsaStudioBlazorWasm.csproj"
                />
              </div>
            </StepItem>


            {/* Step 3 */}
            <StepItem
              number={3}
              title="Remove Default Files"
              description="Remove the default Blazor template files that we'll replace."
            >
              <CodeBlock
                code={filesToRemove}
                language="bash"
                title="Terminal"
              />
            </StepItem>

            {/* Step 4 */}
            <StepItem
              number={4}
              title="Configure Program.cs"
              description="Replace the contents of Program.cs with Elsa Studio configuration."
            >
              <CodeBlock
                code={programCs}
                language="csharp"
                title="Program.cs"
              />
            </StepItem>

            {/* Step 5 */}
            <StepItem
              number={5}
              title="Keep a minimal _Imports.razor"
              description={
                <p>
                  Elsa Studio {ELSA_VERSION} supplies its own{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">App</code>{" "}
                  root component from{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">Elsa.Studio.Shell</code>,
                  so you do not write an{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">App.razor</code>,{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">Routes.razor</code> or{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">MainLayout.razor</code>{" "}
                  yourself. Only a small{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">_Imports.razor</code>{" "}
                  is needed.
                </p>
              }
            >
              <CodeBlock code={importsRazor} language="razor" title="_Imports.razor" />
            </StepItem>


            {/* Step 6 */}
            <StepItem
              number={6}
              title="Configure appsettings.json"
              description={
                <p>
                  Create or update <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">wwwroot/appsettings.json</code> with
                  the URL of your Elsa Server.
                </p>
              }
            >
              <CodeBlock
                code={appSettingsJson}
                language="json"
                title="wwwroot/appsettings.json"
              />
            </StepItem>

            {/* Step 7 */}
            <StepItem
              number={7}
              title="Update index.html"
              description={
                <p>
                  Replace <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">wwwroot/index.html</code> to include
                  the required stylesheets and scripts.
                </p>
              }
            >
              <CodeBlock
                code={indexHtml}
                language="html"
                title="wwwroot/index.html"
              />
            </StepItem>

            {/* Step 8 */}
            <StepItem
              number={8}
              title="Run the Studio"
              description="Start the Elsa Studio application."
            >
              <CodeBlock code="dotnet run" language="bash" title="Terminal" />
              <Alert className="mt-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Serving this app from an ASP.NET Core host</AlertTitle>
                <AlertDescription>
                  If you host this WebAssembly app from an ASP.NET Core project instead of running
                  it standalone, call{" "}
                  <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">
                    app.UseBlazorFrameworkFiles()
                  </code>{" "}
                  before{" "}
                  <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">
                    app.UseStaticFiles()
                  </code>
                  . In the other order the ICU globalization{" "}
                  <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">.dat</code>{" "}
                  files under <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">_framework</code>{" "}
                  return 404 and the page stays on "Loading…".
                </AlertDescription>
              </Alert>

              <div className="mt-6 p-4 rounded-lg border bg-muted/30 space-y-2">
                <p className="text-sm text-muted-foreground">
                  The studio will open in your browser. Login with the default credentials:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside">
                  <li>Username: <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">admin</code></li>
                  <li>Password: <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">password</code></li>
                </ul>
              </div>
            </StepItem>

            {/* Next Steps */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Next Steps</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Button variant="outline" className="h-auto p-4 justify-start" asChild>
                  <a
                    href="https://docs.elsaworkflows.io/application-types/elsa-studio"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <BookOpen className="h-5 w-5 mr-3 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">Full Documentation</p>
                      <p className="text-sm text-muted-foreground">
                        Customization and theming
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 ml-auto" />
                  </a>
                </Button>
                <Button variant="outline" className="h-auto p-4 justify-start" asChild>
                  <a
                    href="https://github.com/elsa-workflows/elsa-samples"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ArrowRight className="h-5 w-5 mr-3 text-primary" />
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
              prevHref="/get-started/elsa-server"
              prevLabel="Back to Elsa Server"
              nextHref="/get-started/elsa-server-and-studio"
              nextLabel="Combined Setup"
            />
          </div>
        </div>
      </section>
    </Layout>
  );
}
