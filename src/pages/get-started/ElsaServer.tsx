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

const packages = `dotnet add package Elsa
dotnet add package Elsa.EntityFrameworkCore
dotnet add package Elsa.EntityFrameworkCore.Sqlite
dotnet add package Elsa.Identity
dotnet add package Elsa.Scheduling
dotnet add package Elsa.Workflows.Api
dotnet add package Elsa.CSharp
dotnet add package Elsa.JavaScript
dotnet add package Elsa.Liquid`;

const programCs = `using Elsa.EntityFrameworkCore.Extensions;
using Elsa.EntityFrameworkCore.Modules.Management;
using Elsa.EntityFrameworkCore.Modules.Runtime;
using Elsa.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddElsa(elsa =>
{
    // Configure management feature to use EF Core
    elsa.UseWorkflowManagement(management => 
        management.UseEntityFrameworkCore(ef => ef.UseSqlite()));

    // Configure runtime feature to use EF Core
    elsa.UseWorkflowRuntime(runtime => 
        runtime.UseEntityFrameworkCore(ef => ef.UseSqlite()));

    // Expose API endpoints
    elsa.UseWorkflowsApi();

    // Use default authentication (API key based)
    elsa.UseIdentity(identity =>
    {
        identity.UseAdminUserProvider();
        identity.TokenOptions = options =>
        {
            options.SigningKey = "my-long-256-bit-secret-token-signing-key";
            options.AccessTokenLifetime = TimeSpan.FromDays(1);
        };
    });

    // Default authentication for API endpoints
    elsa.UseDefaultAuthentication();

    // Add scheduling capabilities
    elsa.UseScheduling();

    // Enable C# workflow expressions
    elsa.UseCSharp();

    // Enable JavaScript workflow expressions
    elsa.UseJavaScript();

    // Enable Liquid workflow expressions
    elsa.UseLiquid();
});

// CORS for studio access
builder.Services.AddCors(cors => 
    cors.AddDefaultPolicy(policy => 
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod()));

var app = builder.Build();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseWorkflowsApi();
app.Run();`;

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
