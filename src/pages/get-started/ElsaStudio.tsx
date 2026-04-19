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

const packages = `dotnet add package Elsa.Studio
dotnet add package Elsa.Studio.Core.BlazorWasm
dotnet add package Elsa.Studio.Login.BlazorWasm
dotnet add package Elsa.Studio.Shell.BlazorWasm
dotnet add package Elsa.Studio.Workflows.Designer
dotnet add package Elsa.Studio.Workflows.Core
dotnet add package Elsa.Studio.Workflows.Monaco`;

const programCs = `using Elsa.Studio.Core.BlazorWasm.Extensions;
using Elsa.Studio.Extensions;
using Elsa.Studio.Login.BlazorWasm.Extensions;
using Elsa.Studio.Workflows.Designer.Extensions;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

// Configure Elsa Studio
builder.Services.AddCore();
builder.Services.AddShell();
builder.Services.AddRemoteBackend(
    elsaClient => elsaClient.AuthenticationHandler = 
        typeof(AuthenticatingApiHttpMessageHandler));
builder.Services.AddLoginModule();
builder.Services.AddWorkflowsModule();

await builder.Build().RunAsync();`;

const appRazor = `@using Elsa.Studio.Shell
@using Elsa.Studio.Shell.Components

<Routes />`;

const mainLayoutRazor = `@inherits LayoutComponentBase
@using Elsa.Studio.Shell.Components

<ElsaStudioShell />`;

const routesRazor = `@using Elsa.Studio.Shell.Components

<ElsaRoutes />`;

const appSettingsJson = `{
  "Backend": {
    "Url": "https://localhost:5001/elsa/api"
  }
}`;

const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Elsa Studio</title>
    <base href="/" />
    <link rel="icon" type="image/png" href="favicon.png" />
    <link href="_content/MudBlazor/MudBlazor.min.css" rel="stylesheet" />
    <link href="_content/Elsa.Studio.Shell/css/shell.css" rel="stylesheet" />
    <link href="ElsaStudioBlazorWasm.styles.css" rel="stylesheet" />
</head>
<body>
    <div id="app">
        <div class="loading-splash">
            <h1>Loading Elsa Studio...</h1>
        </div>
    </div>
    <script src="_content/MudBlazor/MudBlazor.min.js"></script>
    <script src="_content/BlazorMonaco/jsInterop.js"></script>
    <script src="_content/BlazorMonaco/lib/monaco-editor/min/vs/loader.js"></script>
    <script src="_content/BlazorMonaco/lib/monaco-editor/min/vs/editor/editor.main.js"></script>
    <script src="_framework/blazor.webassembly.js"></script>
</body>
</html>`;

const filesToRemove = `rm -rf Pages
rm -rf Layout
rm App.razor
rm MainLayout.razor
rm Routes.razor
rm _Imports.razor`;

export default function ElsaStudio() {
  return (
    <Layout>
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
              title="Create Razor Components"
              description="Create the required Razor components for the application shell."
            >
              <div className="space-y-4">
                <CodeBlock code={appRazor} language="razor" title="App.razor" />
                <CodeBlock
                  code={mainLayoutRazor}
                  language="razor"
                  title="MainLayout.razor"
                />
                <CodeBlock
                  code={routesRazor}
                  language="razor"
                  title="Routes.razor"
                />
              </div>
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
