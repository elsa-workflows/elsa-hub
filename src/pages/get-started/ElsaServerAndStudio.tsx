import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { BookOpen, ExternalLink, Sparkles, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CodeBlock,
  StepItem,
  PrerequisitesBox,
  GuideBreadcrumb,
  GuideNavigation,
} from "@/components/get-started";

const cloneCore = `git clone https://github.com/elsa-workflows/elsa-core.git
cd elsa-core
git checkout release/3.6.1`;

const runServerWeb = `dotnet run --project ./src/apps/Elsa.Server.Web/Elsa.Server.Web.csproj`;

const cloneStudio = `git clone https://github.com/elsa-workflows/elsa-studio.git
cd elsa-studio
git checkout release/3.6.1`;

const buildStudioAssets = `# Asset bundle #1 — DOM interop
cd src/framework/Elsa.Studio.DomInterop/ClientLib
npm install
npm run build
cd ../../../..

# Asset bundle #2 — Workflow Designer
cd src/modules/Elsa.Studio.Workflows.Designer/ClientLib
npm install
npm run build
cd ../../../..

dotnet restore Elsa.Studio.sln
dotnet build Elsa.Studio.sln`;

const runStudioServerHost = `dotnet run --project ./src/hosts/Elsa.Studio.Host.Server/Elsa.Studio.Host.Server.csproj`;

const studioBackendConfig = `{
  "Backend": {
    "Url": "https://localhost:5001/elsa/api"
  }
}`;

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
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              <h1 className="text-4xl md:text-5xl font-bold">
                Run Elsa Server + Studio
              </h1>
              <Badge className="gap-1">
                <Sparkles className="h-3 w-3" />
                Recommended
              </Badge>
            </div>
            <p className="text-xl text-muted-foreground">
              The most reliable evaluation path for{" "}
              <strong>release/3.6.1</strong>: run the official Elsa Server
              reference app and the official Elsa Studio host side by side.
            </p>
          </div>
        </div>
      </section>

      {/* Guide Content */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto space-y-16">
            <PrerequisitesBox
              items={[
                "The .NET SDK versions required by elsa-core and elsa-studio at release/3.6.1",
                "Node.js and npm (used to build the Studio frontend assets, per the released repo)",
                "Git",
              ]}
            />

            {/* Architecture Overview */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Two apps working together — not one combined app</AlertTitle>
              <AlertDescription>
                This guide does <strong>not</strong> scaffold a custom combined
                Host+Client solution. Instead you run two released apps: the
                Elsa Server reference app from the{" "}
                <code className="px-1 rounded bg-muted font-mono text-xs">elsa-core</code> repo and
                the Elsa Studio host from the{" "}
                <code className="px-1 rounded bg-muted font-mono text-xs">elsa-studio</code> repo,
                both on the <code className="px-1 rounded bg-muted font-mono text-xs">release/3.6.1</code> branch.
                That is the path with the highest chance of success and the
                shortest distance from clone to working dashboard.
              </AlertDescription>
            </Alert>

            <div className="rounded-lg border bg-muted/30 p-6">
              <h3 className="font-semibold mb-3">What you will run</h3>
              <div className="flex items-center gap-4 text-sm flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <span>
                    Elsa Server (
                    <code className="px-1 rounded bg-muted font-mono text-xs">
                      elsa-core/src/apps/Elsa.Server.Web
                    </code>
                    )
                  </span>
                </div>
                <span className="text-muted-foreground">↔</span>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-primary/50" />
                  <span>
                    Elsa Studio (
                    <code className="px-1 rounded bg-muted font-mono text-xs">
                      elsa-studio/src/hosts/Elsa.Studio.Host.Server
                    </code>
                    )
                  </span>
                </div>
              </div>
            </div>

            {/* Step 1 */}
            <StepItem
              number={1}
              title="Clone elsa-core at release/3.6.1"
              description="Get the released backend source. The reference server app already has persistence, identity, HTTP and the management API wired up correctly for 3.6.1."
            >
              <CodeBlock code={cloneCore} language="bash" title="Terminal" />
            </StepItem>

            {/* Step 2 */}
            <StepItem
              number={2}
              title="Run the Reference Server App"
              description={
                <p>
                  Launch{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">
                    Elsa.Server.Web
                  </code>
                  . The app exposes the management API at{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">/elsa/api</code>{" "}
                  on whatever URL it prints in the terminal (this depends on
                  the app's launch profile and your local environment — don't
                  assume a specific port). <strong>Note the actual base URL
                  shown in the terminal — you'll need it in Step 5.</strong>{" "}
                  Leave this terminal running.
                </p>
              }
            >
              <CodeBlock code={runServerWeb} language="bash" title="Terminal — elsa-core" />
            </StepItem>

            {/* Step 3 */}
            <StepItem
              number={3}
              title="Clone elsa-studio at release/3.6.1"
              description="In a second terminal, clone the dashboard repo at the matching release branch."
            >
              <CodeBlock code={cloneStudio} language="bash" title="Terminal — elsa-studio" />
            </StepItem>

            {/* Step 4 */}
            <StepItem
              number={4}
              title="Build Studio Assets and Solution"
              description={
                <p>
                  The released Studio repo has two{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">ClientLib</code>{" "}
                  asset bundles that must be built before the .NET solution
                  will run correctly. Build both, then restore and build the
                  solution.
                </p>
              }
            >
              <CodeBlock code={buildStudioAssets} language="bash" title="Terminal — elsa-studio" />
            </StepItem>

            {/* Step 5 */}
            <StepItem
              number={5}
              title="Point Studio at the Server"
              description={
                <p>
                  Update{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">
                    src/hosts/Elsa.Studio.Host.Server/appsettings.json
                  </code>{" "}
                  so{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">Backend.Url</code>{" "}
                  matches the actual Elsa Server URL from Step 2 exactly,
                  including scheme, host, port and the{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">/elsa/api</code>{" "}
                  suffix. The example below is illustrative — replace it with
                  your real URL.
                </p>
              }
            >
              <CodeBlock
                code={studioBackendConfig}
                language="json"
                title="src/hosts/Elsa.Studio.Host.Server/appsettings.json"
              />
            </StepItem>

            {/* Step 6 */}
            <StepItem
              number={6}
              title="Run the Studio Host"
              description="Start the Blazor Server host for Elsa Studio. Use a different port than Elsa Server."
            >
              <CodeBlock
                code={runStudioServerHost}
                language="bash"
                title="Terminal — elsa-studio"
              />
              <div className="mt-6 p-4 rounded-lg border bg-muted/30 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Open the Studio URL printed in the terminal and sign in with
                  the credentials configured by the reference Elsa Server (the{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">Elsa.Server.Web</code>{" "}
                  app's <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">appsettings.json</code>{" "}
                  defines the seeded admin user). If sign-in fails, double-check
                  that <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">Backend.Url</code>{" "}
                  exactly matches the server URL from Step 2.
                </p>
                <p className="text-sm text-muted-foreground">
                  Prefer the WebAssembly host? Run{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">Elsa.Studio.Host.Wasm</code>{" "}
                  instead — its config lives under{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">wwwroot/appsettings.json</code>.
                </p>
              </div>
            </StepItem>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Want to customize deeply?</AlertTitle>
              <AlertDescription>
                Once the released apps run end-to-end, fork or copy them as a
                starting point. The Server reference lives at{" "}
                <a
                  href="https://github.com/elsa-workflows/elsa-core/tree/release/3.6.1/src/apps/Elsa.Server.Web"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-4"
                >
                  elsa-core / src/apps/Elsa.Server.Web
                </a>{" "}
                and the Studio hosts live under{" "}
                <a
                  href="https://github.com/elsa-workflows/elsa-studio/tree/release/3.6.1/src/hosts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-4"
                >
                  elsa-studio / src/hosts
                </a>
                . Building a single combined custom Host+Client app is an
                advanced scenario and is intentionally not covered here.
              </AlertDescription>
            </Alert>

            {/* Next Steps */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Next Steps</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Button variant="outline" className="h-auto p-4 justify-start" asChild>
                  <a
                    href="https://github.com/elsa-workflows/elsa-core/tree/release/3.6.1"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <BookOpen className="h-5 w-5 mr-3 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">elsa-core (3.6.1)</p>
                      <p className="text-sm text-muted-foreground">
                        Engine source and reference apps
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 ml-auto" />
                  </a>
                </Button>
                <Button variant="outline" className="h-auto p-4 justify-start" asChild>
                  <a
                    href="https://github.com/elsa-workflows/elsa-studio/tree/release/3.6.1"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Sparkles className="h-5 w-5 mr-3 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">elsa-studio (3.6.1)</p>
                      <p className="text-sm text-muted-foreground">
                        Dashboard hosts and modules
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
