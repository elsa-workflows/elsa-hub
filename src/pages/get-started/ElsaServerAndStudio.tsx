import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { BookOpen, ExternalLink, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  CodeBlock,
  StepItem,
  PrerequisitesBox,
  GuideBreadcrumb,
  GuideNavigation,
} from "@/components/get-started";

const hostProgramCs = `using Elsa.EntityFrameworkCore.Extensions;
using Elsa.EntityFrameworkCore.Modules.Management;
using Elsa.EntityFrameworkCore.Modules.Runtime;
using Elsa.Extensions;
using Elsa.Studio.Host.Options;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

// Add Elsa services
builder.Services.AddElsa(elsa =>
{
    elsa.UseWorkflowManagement(management => 
        management.UseEntityFrameworkCore(ef => ef.UseSqlite()));

    elsa.UseWorkflowRuntime(runtime => 
        runtime.UseEntityFrameworkCore(ef => ef.UseSqlite()));

    elsa.UseWorkflowsApi();

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
    elsa.UseScheduling();
    elsa.UseCSharp();
    elsa.UseJavaScript();
    elsa.UseLiquid();
});

// Add Elsa Studio services
builder.Services.AddElsaStudio(elsa =>
{
    elsa.HostOptions = new ElsaHostOptions
    {
        HeadlessMode = true
    };
});

builder.Services.AddRazorPages();

var app = builder.Build();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.UseWorkflowsApi();
app.MapFallbackToPage("/_Host");
app.Run();`;

const appSettingsJson = `{
  "Identity": {
    "SigningKey": "my-long-256-bit-secret-token-signing-key"
  }
}`;

const hostCshtml = `@page "/"
@using Microsoft.AspNetCore.Components.Web
@namespace ElsaServerAndStudio.Host.Pages
@addTagHelper *, Microsoft.AspNetCore.Mvc.TagHelpers

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Elsa Workflows</title>
    <base href="/" />
    <link href="_content/MudBlazor/MudBlazor.min.css" rel="stylesheet" />
    <link href="_content/Elsa.Studio.Shell/css/shell.css" rel="stylesheet" />
    <link href="Host.styles.css" rel="stylesheet" />
</head>
<body>
    <component type="typeof(Client.App)" render-mode="WebAssemblyPrerendered" />
    <script src="_content/MudBlazor/MudBlazor.min.js"></script>
    <script src="_content/BlazorMonaco/jsInterop.js"></script>
    <script src="_content/BlazorMonaco/lib/monaco-editor/min/vs/loader.js"></script>
    <script src="_content/BlazorMonaco/lib/monaco-editor/min/vs/editor/editor.main.js"></script>
    <script src="_framework/blazor.webassembly.js"></script>
</body>
</html>`;

const clientProgramCs = `using Client;
using Elsa.Studio.Core.BlazorWasm.Extensions;
using Elsa.Studio.Extensions;
using Elsa.Studio.Login.BlazorWasm.Extensions;
using Elsa.Studio.Workflows.Designer.Extensions;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

builder.Services.AddCore();
builder.Services.AddShell();
builder.Services.AddRemoteBackend(
    elsaClient => elsaClient.AuthenticationHandler = 
        typeof(AuthenticatingApiHttpMessageHandler));
builder.Services.AddLoginModule();
builder.Services.AddWorkflowsModule();

await builder.Build().RunAsync();`;

const clientAppRazor = `@using Elsa.Studio.Shell
@using Elsa.Studio.Shell.Components

<Routes />`;

const clientMainLayoutRazor = `@inherits LayoutComponentBase
@using Elsa.Studio.Shell.Components

<ElsaStudioShell />`;

const clientRoutesRazor = `@using Elsa.Studio.Shell.Components

<ElsaRoutes />`;

const clientAppSettingsJson = `{
  "Backend": {
    "Url": "/elsa/api"
  }
}`;

const hostPackages = `dotnet add package Elsa
dotnet add package Elsa.EntityFrameworkCore
dotnet add package Elsa.EntityFrameworkCore.Sqlite
dotnet add package Elsa.Identity
dotnet add package Elsa.Scheduling
dotnet add package Elsa.Workflows.Api
dotnet add package Elsa.CSharp
dotnet add package Elsa.JavaScript
dotnet add package Elsa.Liquid
dotnet add package Elsa.Studio.Host.Server`;

const clientPackages = `dotnet add package Elsa.Studio
dotnet add package Elsa.Studio.Core.BlazorWasm
dotnet add package Elsa.Studio.Login.BlazorWasm
dotnet add package Elsa.Studio.Shell.BlazorWasm
dotnet add package Elsa.Studio.Workflows.Designer
dotnet add package Elsa.Studio.Workflows.Core
dotnet add package Elsa.Studio.Workflows.Monaco`;

export default function ElsaServerAndStudio() {
  return (
    <Layout>
      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container">
          <div className="mb-6">
            <GuideBreadcrumb currentPage="Server + Studio" />
          </div>
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <h1 className="text-4xl md:text-5xl font-bold">
                Set Up Elsa Server + Studio
              </h1>
              <Badge className="gap-1">
                <Sparkles className="h-3 w-3" />
                Recommended
              </Badge>
            </div>
            <p className="text-xl text-muted-foreground">
              Build a single application that runs both the workflow engine and
              visual designer. The quickest path to a complete solution.
            </p>
          </div>
        </div>
      </section>

      {/* Guide Content */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto space-y-16">
            {/* Prerequisites */}
            <PrerequisitesBox items={[".NET 8.0 SDK or later"]} />

            {/* Architecture Overview */}
            <div className="rounded-lg border bg-muted/30 p-6">
              <h3 className="font-semibold mb-3">Architecture Overview</h3>
              <p className="text-sm text-muted-foreground mb-4">
                This setup uses two projects: a <strong>Host</strong> (ASP.NET
                Core server) that runs the workflow engine and serves the
                studio, and a <strong>Client</strong> (Blazor WebAssembly) that
                provides the visual designer. The Host serves the Client as a
                static web app.
              </p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <span>Host (Server)</span>
                </div>
                <span className="text-muted-foreground">→</span>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-primary/50" />
                  <span>Client (Studio)</span>
                </div>
              </div>
            </div>

            {/* Step 1 */}
            <StepItem
              number={1}
              title="Create Solution Structure"
              description="Create the solution directory and initialize a new .NET solution."
            >
              <CodeBlock
                code={`mkdir ElsaServerAndStudio && cd ElsaServerAndStudio
dotnet new sln`}
                language="bash"
                title="Terminal"
              />
            </StepItem>

            {/* Step 2 */}
            <StepItem
              number={2}
              title="Create the Host Project"
              description="Create the ASP.NET Core host project that will run both the workflow engine and serve the studio."
            >
              <div className="space-y-4">
                <CodeBlock
                  code={`dotnet new web -n "Host"
cd Host`}
                  language="bash"
                  title="Terminal"
                />
                <CodeBlock
                  code={hostPackages}
                  language="bash"
                  title="Terminal - Add Packages"
                />
              </div>
            </StepItem>

            {/* Step 3 */}
            <StepItem
              number={3}
              title="Configure Host Program.cs"
              description="Replace the contents of Host/Program.cs with the combined server and studio configuration."
            >
              <CodeBlock
                code={hostProgramCs}
                language="csharp"
                title="Host/Program.cs"
              />
            </StepItem>

            {/* Step 4 */}
            <StepItem
              number={4}
              title="Create Host Configuration"
              description="Create the appsettings.json file in the Host project."
            >
              <CodeBlock
                code={appSettingsJson}
                language="json"
                title="Host/appsettings.json"
              />
            </StepItem>

            {/* Step 5 */}
            <StepItem
              number={5}
              title="Create _Host.cshtml"
              description={
                <p>
                  Create <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">Host/Pages/_Host.cshtml</code> to
                  serve the Blazor app.
                </p>
              }
            >
              <CodeBlock
                code={hostCshtml}
                language="html"
                title="Host/Pages/_Host.cshtml"
              />
            </StepItem>

            {/* Step 6 */}
            <StepItem
              number={6}
              title="Create the Client Project"
              description="Go back to the solution root and create the Blazor client project."
            >
              <div className="space-y-4">
                <CodeBlock
                  code={`cd ..
dotnet new razorclasslib -n "Client"
cd Client`}
                  language="bash"
                  title="Terminal"
                />
                <CodeBlock
                  code={clientPackages}
                  language="bash"
                  title="Terminal - Add Packages"
                />
              </div>
            </StepItem>

            {/* Step 7 */}
            <StepItem
              number={7}
              title="Configure Client"
              description="Create the Blazor components and configuration for the client."
            >
              <div className="space-y-4">
                <CodeBlock
                  code={clientProgramCs}
                  language="csharp"
                  title="Client/Program.cs"
                />
                <CodeBlock
                  code={clientAppRazor}
                  language="razor"
                  title="Client/App.razor"
                />
                <CodeBlock
                  code={clientMainLayoutRazor}
                  language="razor"
                  title="Client/MainLayout.razor"
                />
                <CodeBlock
                  code={clientRoutesRazor}
                  language="razor"
                  title="Client/Routes.razor"
                />
                <CodeBlock
                  code={clientAppSettingsJson}
                  language="json"
                  title="Client/wwwroot/appsettings.json"
                />
              </div>
            </StepItem>

            {/* Step 8 */}
            <StepItem
              number={8}
              title="Link Projects and Run"
              description="Add project references, add to solution, and run the application."
            >
              <CodeBlock
                code={`cd ../Host
dotnet add reference ../Client
cd ..
dotnet sln add Host
dotnet sln add Client
cd Host
dotnet run`}
                language="bash"
                title="Terminal"
              />
              <div className="mt-6 p-4 rounded-lg border bg-muted/30 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Open your browser and navigate to the URL shown in the
                  terminal. Login with:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside">
                  <li>
                    Username:{" "}
                    <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">
                      admin
                    </code>
                  </li>
                  <li>
                    Password:{" "}
                    <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">
                      password
                    </code>
                  </li>
                </ul>
              </div>
            </StepItem>

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
