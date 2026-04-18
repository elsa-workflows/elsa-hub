import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, ExternalLink, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CodeBlock,
  StepItem,
  PrerequisitesBox,
  GuideBreadcrumb,
  GuideNavigation,
} from "@/components/get-started";

const packages = `dotnet add package Elsa --version 3.6.1
dotnet add package Elsa.Persistence.EFCore --version 3.6.1
dotnet add package Elsa.Persistence.EFCore.Sqlite --version 3.6.1
dotnet add package Elsa.Identity --version 3.6.1
dotnet add package Elsa.Scheduling --version 3.6.1
dotnet add package Elsa.Workflows.Api --version 3.6.1
dotnet add package Elsa.Http --version 3.6.1
dotnet add package Elsa.Expressions.CSharp --version 3.6.1
dotnet add package Elsa.Expressions.JavaScript --version 3.6.1
dotnet add package Elsa.Expressions.Liquid --version 3.6.1`;

const programCs = `using Elsa.Extensions;
using Elsa.Persistence.EFCore.Extensions;
using Elsa.Persistence.EFCore.Modules.Management;
using Elsa.Persistence.EFCore.Modules.Runtime;

var builder = WebApplication.CreateBuilder(args);
var configuration = builder.Configuration;

builder.Services.AddElsa(elsa =>
{
    // Persistence (SQLite for evaluation; switch the provider for production).
    elsa.UseWorkflowManagement(management =>
        management.UseEntityFrameworkCore(ef => ef.UseSqlite()));

    elsa.UseWorkflowRuntime(runtime =>
        runtime.UseEntityFrameworkCore(ef => ef.UseSqlite()));

    // Identity + token-based authentication for the management API.
    elsa.UseIdentity(identity =>
    {
        identity.UseConfigurationBasedUserProvider(o => configuration.GetSection("Identity").Bind(o));
        identity.TokenOptions = options => configuration.GetSection("Identity:Tokens").Bind(options);
    });
    elsa.UseDefaultAuthentication();

    // HTTP activities + Studio-facing API surface.
    elsa.UseHttp();
    elsa.UseWorkflowsApi();

    // Background scheduling.
    elsa.UseScheduling();

    // Expression languages.
    elsa.UseCSharp();
    elsa.UseJavaScript();
    elsa.UseLiquid();
});

// CORS so a separately hosted Elsa Studio can call the API during development.
builder.Services.AddCors(cors =>
    cors.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod()));

var app = builder.Build();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// Map Elsa management API + HTTP workflow endpoints.
app.UseWorkflowsApi();
app.UseWorkflows();

app.Run();`;

const appSettings = `{
  "ConnectionStrings": {
    "Sqlite": "Data Source=elsa.sqlite.db;Cache=Shared;"
  },
  "Identity": {
    "Tokens": {
      "SigningKey": "REPLACE-WITH-A-LONG-RANDOM-256-BIT-SECRET",
      "AccessTokenLifetime": "1.00:00:00"
    },
    "Roles": [
      { "Id": "admin", "Name": "Administrator", "Permissions": [ "*" ] }
    ],
    "Users": [
      {
        "Id": "admin",
        "Name": "admin",
        "Email": "admin@elsa.local",
        "Password": "password",
        "Roles": [ "admin" ]
      }
    ]
  },
  "Http": {
    "BaseUrl": "https://localhost:5001",
    "BasePath": "/workflows"
  }
}`;

export default function ElsaServer() {
  return (
    <Layout>
      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container">
          <div className="mb-6">
            <GuideBreadcrumb currentPage="Elsa Server" />
          </div>
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Set Up Elsa Server
            </h1>
            <p className="text-xl text-muted-foreground">
              Build a minimal ASP.NET Core backend that hosts the Elsa workflow
              engine and exposes the management API consumed by Elsa Studio.
              Targets the released <strong>3.6.1</strong> packages.
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
                "Familiarity with ASP.NET Core hosting",
              ]}
            />

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>This is a minimal custom server</AlertTitle>
              <AlertDescription>
                The steps below produce a working backend you can point Elsa
                Studio at. For a production-shaped configuration (multi-database
                providers, multitenancy, OpenTelemetry, real-time workflows,
                etc.) use the official reference app{" "}
                <a
                  href="https://github.com/elsa-workflows/elsa-core/tree/release/3.6.1/src/apps/Elsa.Server.Web"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-4"
                >
                  src/apps/Elsa.Server.Web
                </a>{" "}
                in <code className="px-1 rounded bg-muted font-mono text-xs">elsa-core</code> on the{" "}
                <code className="px-1 rounded bg-muted font-mono text-xs">release/3.6.1</code> branch.
              </AlertDescription>
            </Alert>

            {/* Step 1 */}
            <StepItem
              number={1}
              title="Create a New Project"
              description="Create a new ASP.NET Core web application using the .NET CLI."
            >
              <CodeBlock
                code={`dotnet new web -n "ElsaServer"
cd ElsaServer`}
                language="bash"
                title="Terminal"
              />
            </StepItem>

            {/* Step 2 */}
            <StepItem
              number={2}
              title="Add Elsa 3.6.1 Packages"
              description={
                <p>
                  Install the core Elsa packages. Note the 3.6 naming:
                  persistence packages are{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">
                    Elsa.Persistence.EFCore.*
                  </code>{" "}
                  and the scripting packages are{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">
                    Elsa.Expressions.*
                  </code>
                  .
                </p>
              }
            >
              <CodeBlock code={packages} language="bash" title="Terminal" />
            </StepItem>

            {/* Step 3 */}
            <StepItem
              number={3}
              title="Configure Program.cs"
              description={
                <p>
                  Replace the contents of{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">
                    Program.cs
                  </code>{" "}
                  with the configuration below. This wires up persistence,
                  identity, the management API, HTTP activities, scheduling and
                  the expression languages.
                </p>
              }
            >
              <CodeBlock
                code={programCs}
                language="csharp"
                title="Program.cs"
              />
            </StepItem>

            {/* Step 4 */}
            <StepItem
              number={4}
              title="Configure appsettings.json"
              description={
                <p>
                  Add the signing key, an admin user, and the HTTP base URL used
                  by HTTP-triggered workflows. Replace the signing key with a
                  long random secret before running anywhere other than your
                  local machine.
                </p>
              }
            >
              <CodeBlock
                code={appSettings}
                language="json"
                title="appsettings.json"
              />
            </StepItem>

            {/* Step 5 */}
            <StepItem
              number={5}
              title="Run the Server"
              description={
                <p>
                  Start the application. The server exposes the management API
                  at <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">/elsa/api</code>{" "}
                  and HTTP workflow endpoints under{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">/workflows</code>.
                </p>
              }
            >
              <CodeBlock code="dotnet run" language="bash" title="Terminal" />
              <div className="mt-6 p-4 rounded-lg border bg-muted/30 space-y-2">
                <p className="text-sm text-muted-foreground">
                  The default admin credentials are{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">admin</code> /{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">password</code>.
                  Point Elsa Studio at the API base URL (for example{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">https://localhost:5001/elsa/api</code>)
                  to start designing workflows.
                </p>
              </div>
            </StepItem>

            {/* Next Steps */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Next Steps</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Button variant="outline" className="h-auto p-4 justify-start" asChild>
                  <a
                    href="https://github.com/elsa-workflows/elsa-core/tree/release/3.6.1/src/apps/Elsa.Server.Web"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <BookOpen className="h-5 w-5 mr-3 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">Reference Server App</p>
                      <p className="text-sm text-muted-foreground">
                        elsa-core release/3.6.1
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 ml-auto" />
                  </a>
                </Button>
                <Button variant="outline" className="h-auto p-4 justify-start" asChild>
                  <a
                    href="https://docs.elsaworkflows.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ArrowRight className="h-5 w-5 mr-3 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">Documentation</p>
                      <p className="text-sm text-muted-foreground">
                        Guides and API reference
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 ml-auto" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Navigation */}
            <GuideNavigation
              prevHref="/get-started"
              prevLabel="Back to Get Started"
              nextHref="/get-started/elsa-studio"
              nextLabel="Set up Elsa Studio"
            />
          </div>
        </div>
      </section>
    </Layout>
  );
}
