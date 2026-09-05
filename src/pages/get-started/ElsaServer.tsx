import { Seo } from "@/components/Seo";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, ExternalLink } from "lucide-react";
import {
  CodeBlock,
  StepItem,
  PrerequisitesBox,
  GuideBreadcrumb,
  GuideNavigation,
} from "@/components/get-started";
import { ELSA_VERSION, pkg } from "@/data/elsaVersion";

const packages = [
  "Elsa",
  "Elsa.Persistence.EFCore",
  "Elsa.Persistence.EFCore.Sqlite",
  "Elsa.Http",
  "Elsa.Identity",
  "Elsa.Scheduling",
  "Elsa.Workflows.Api",
  "Elsa.Dashboard.Api",
  "Elsa.Workflows.Runtime.Dashboard",
  "Elsa.Expressions.CSharp",
  "Elsa.Expressions.JavaScript",
  "Elsa.Expressions.Liquid",
]
  .map(pkg)
  .join("\n");

// Verified by compiling this exact source against the Elsa 3.8.0 packages
// listed above (.NET 9 SDK 9.0.311): build succeeded, 0 warnings, 0 errors,
// and the host starts in Production with configured identity secrets.
const programCs = `using Elsa.Extensions;
using Elsa.Http.Options;
using Elsa.Persistence.EFCore.Extensions;
using Elsa.Persistence.EFCore.Modules.Management;
using Elsa.Persistence.EFCore.Modules.Runtime;
using Elsa.Workflows.Api;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);
var configuration = builder.Configuration;

builder.Services.AddElsa(elsa =>
{
    // Identity. Elsa 3.8.0 rejects a missing signing key, a key shorter than
    // 32 ASCII characters, and known public defaults outside Development/Demo.
    // Bootstrap the first admin with UseDefaultAdmin and supply the values from
    // configuration or a secret manager - never hard-code them.
    elsa.UseIdentity(identity =>
    {
        identity.TokenOptions += options => configuration.GetSection("Identity:Tokens").Bind(options);

        identity.UseDefaultAdmin(admin => admin
            .WithAdminUserName(configuration["Identity:DefaultAdmin:UserName"]!)
            .WithAdminPassword(configuration["Identity:DefaultAdmin:Password"]!)
            .WithAdminRoleName("admin")
            .WithAdminRolePermissions(new List<string> { "*" }));
    });

    // Issues and validates the bearer tokens used by the Elsa API.
    elsa.UseDefaultAuthentication();

    // Workflow engine, persistence and runtime.
    elsa.UseWorkflows();
    elsa.UseWorkflowManagement(management => management.UseEntityFrameworkCore(ef => ef.UseSqlite()));
    elsa.UseWorkflowRuntime(runtime => runtime.UseEntityFrameworkCore(ef => ef.UseSqlite()));

    // REST API consumed by Elsa Studio and your own clients.
    elsa.UseWorkflowsApi();

    elsa.UseScheduling();

    // HTTP module: HTTP Endpoint activities and the workflow middleware below.
    elsa.UseHttp(http => http.ConfigureHttpOptions = options => configuration.GetSection("Http").Bind(options));

    // Expression languages. C# executes host code: it requires
    // Scripting:CSharp:AllowHostCodeExecution plus the
    // exec:csharp-expressions permission, and is not a sandbox.
    elsa.UseCSharp(csharp => csharp.CSharpOptions += options => configuration.GetSection("Scripting:CSharp").Bind(options));
    elsa.UseJavaScript();
    elsa.UseLiquid();
});

// CORS so Elsa Studio can call this API from another origin.
builder.Services.AddCors(cors => cors.AddDefaultPolicy(policy => policy
    .AllowAnyOrigin()
    .AllowAnyHeader()
    .AllowAnyMethod()
    .WithExposedHeaders("*")));

var app = builder.Build();

app.UseCors();

// Map the Elsa API under its configured route prefix (default: elsa/api).
var apiEndpointOptions = app.Services.GetRequiredService<IOptions<ApiEndpointOptions>>().Value;
app.MapWorkflowsApi(apiEndpointOptions.RoutePrefix);

app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();

// Returns JSON for unhandled serialization errors.
app.UseJsonSerializationErrorHandler();

// Serves workflows that start with an HTTP Endpoint activity.
app.UseWorkflows();

app.Run();`;

const appSettings = `{
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
  }
}`;


export default function ElsaServer() {
  return (
    <Layout>
      <Seo path="/get-started/elsa-server" title={`Get started with Elsa Server (${ELSA_VERSION})`} description={`Step-by-step guide to running Elsa Server ${ELSA_VERSION}: a standalone .NET workflow engine you can host and call from any client.`} />
      
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
              Create an ASP.NET Core application that manages and executes
              workflows via REST API. This is the workflow engine backend.
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
              ]}
            />

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
              title="Add Elsa Packages"
              description={
                <p>
                  Install the core Elsa packages. These include the workflow
                  engine, persistence with SQLite, identity management,
                  scheduling, and scripting support.
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
                  Replace the contents of <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">Program.cs</code> with
                  the Elsa configuration. This sets up EF Core persistence, API
                  endpoints, authentication, and expression languages.
                </p>
              }
            >
              <CodeBlock code={programCs} language="csharp" title="Program.cs" />
            </StepItem>

            {/* Step 4 */}
            <StepItem
              number={4}
              title="Configure identity secrets"
              description={
                <p>
                  Elsa {ELSA_VERSION} ships no usable admin credentials or API keys.
                  The <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">UseDefaultAdmin</code>{" "}
                  bootstrap above creates the first admin role and user from values you own; it is
                  idempotent and never recreates an existing admin. The signing key must be at least
                  32 printable ASCII characters with no surrounding whitespace; known public defaults
                  are accepted only when the environment is{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">Development</code> or{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">Demo</code>. In
                  production, supply these through environment variables or a secret manager and
                  rotate them after the first sign-in.
                </p>
              }
            >
              <CodeBlock code={appSettings} language="json" title="appsettings.json" />
              <div className="mt-6 p-4 rounded-lg border bg-muted/30 space-y-2 text-sm text-muted-foreground">
                <p>
                  Localhost requests no longer receive security-root bootstrap permissions.
                  A development host that relies on that must opt in explicitly with{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">
                    elsa.UseDefaultAuthentication(auth =&gt; auth.EnableLocalHostPermissionGrantForSecurityRoot())
                  </code>{" "}
                  — the default admin bootstrap above is the recommended alternative.
                </p>

                <p>
                  C# and Python expressions execute host code. They require{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">AllowHostCodeExecution</code>{" "}
                  plus the <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">exec:csharp-expressions</code>{" "}
                  / <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">exec:python-expressions</code>{" "}
                  permission, and are not sandboxed — enable them only for trusted authors.
                </p>
              </div>
            </StepItem>


            {/* Step 5 */}
            <StepItem
              number={5}
              title="Run the Server"
              description={
                <p>
                  Start the application. The server will expose REST API
                  endpoints for workflow management.
                </p>
              }
            >
              <CodeBlock code="dotnet run" language="bash" title="Terminal" />
              <div className="mt-6 p-4 rounded-lg border bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  The server will start on <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">https://localhost:5001</code> (or similar).
                  You can test the API by navigating to <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">/elsa/api/workflow-definitions</code>.
                </p>
              </div>
            </StepItem>

            {/* Next Steps */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Next Steps</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Button variant="outline" className="h-auto p-4 justify-start" asChild>
                  <a
                    href="https://docs.elsaworkflows.io/application-types/elsa-server"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <BookOpen className="h-5 w-5 mr-3 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">Full Documentation</p>
                      <p className="text-sm text-muted-foreground">
                        Advanced configuration options
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
