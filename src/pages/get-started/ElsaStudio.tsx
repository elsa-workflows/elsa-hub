import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, ExternalLink, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CodeBlock,
  StepItem,
  PrerequisitesBox,
  GuideBreadcrumb,
  GuideNavigation,
} from "@/components/get-started";

const cloneAndCheckout = `git clone https://github.com/elsa-workflows/elsa-studio.git
cd elsa-studio
git checkout release/3.6.1`;

const buildDomInteropAssets = `cd src/framework/Elsa.Studio.DomInterop/ClientLib
npm install
npm run build
cd ../../../..`;

const buildDesignerAssets = `cd src/modules/Elsa.Studio.Workflows.Designer/ClientLib
npm install
npm run build
cd ../../../..`;

const restoreAndBuild = `dotnet restore Elsa.Studio.sln
dotnet build Elsa.Studio.sln`;

const runServerHost = `dotnet run --project ./src/hosts/Elsa.Studio.Host.Server/Elsa.Studio.Host.Server.csproj`;

const runWasmHost = `dotnet run --project ./src/hosts/Elsa.Studio.Host.Wasm/Elsa.Studio.Host.Wasm.csproj`;

const backendConfig = `{
  "Backend": {
    "Url": "https://localhost:5001/elsa/api"
  }
}`;

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
              Run the official Elsa Studio dashboard from the released{" "}
              <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-base">release/3.6.1</code>{" "}
              branch and connect it to a running Elsa Server.
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
                "The .NET SDK versions required by the elsa-studio release/3.6.1 README",
                "Node.js and npm (used to build the Studio frontend assets, per the released repo)",
                "Git",
                "A running Elsa Server reachable from your machine",
              ]}
            />

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Server Required</AlertTitle>
              <AlertDescription>
                Elsa Studio is a frontend dashboard. It cannot run on its own —
                it needs a running Elsa Server backend to authenticate against
                and to load and store workflows. If you don't have one yet,{" "}
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
              <Info className="h-4 w-4" />
              <AlertTitle>Use the released host projects</AlertTitle>
              <AlertDescription>
                The reliable getting-started path for 3.6.1 is to clone the{" "}
                <code className="px-1 rounded bg-muted font-mono text-xs">elsa-studio</code> repo and
                run one of its host projects. Composing a fully custom Studio
                from individual NuGet packages is an advanced scenario and is
                not the recommended starting point.
              </AlertDescription>
            </Alert>

            {/* Step 1 */}
            <StepItem
              number={1}
              title="Clone Elsa Studio at release/3.6.1"
              description="Get the released source so the host projects, modules and frontend assets line up."
            >
              <CodeBlock code={cloneAndCheckout} language="bash" title="Terminal" />
            </StepItem>

            {/* Step 2 */}
            <StepItem
              number={2}
              title="Build the Frontend Assets"
              description={
                <p>
                  The released Studio repo ships two{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">ClientLib</code>{" "}
                  folders that need their JS/CSS assets built before the
                  solution will run correctly. Build both, in order. Re-run
                  these whenever you pull asset changes.
                </p>
              }
            >
              <div className="space-y-4">
                <CodeBlock
                  code={buildDomInteropAssets}
                  language="bash"
                  title="Terminal — Elsa.Studio.DomInterop"
                />
                <CodeBlock
                  code={buildDesignerAssets}
                  language="bash"
                  title="Terminal — Elsa.Studio.Workflows.Designer"
                />
              </div>
            </StepItem>

            {/* Step 3 */}
            <StepItem
              number={3}
              title="Restore and Build the Solution"
              description="Restore NuGet dependencies and build the full Studio solution."
            >
              <CodeBlock code={restoreAndBuild} language="bash" title="Terminal" />
            </StepItem>

            {/* Step 4 */}
            <StepItem
              number={4}
              title="Choose a Host Project"
              description={
                <p>
                  The repo ships two host projects under{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">src/hosts</code>.
                  Pick the one that matches how you want to run the dashboard.
                </p>
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <p className="font-semibold">Elsa.Studio.Host.Server</p>
                  <p className="text-sm text-muted-foreground">
                    Blazor Server. Renders on the server, less client-side
                    setup, easier to debug, generally the friendlier option for
                    a first run.
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <p className="font-semibold">Elsa.Studio.Host.Wasm</p>
                  <p className="text-sm text-muted-foreground">
                    Standalone Blazor WebAssembly. Runs entirely in the browser
                    and talks to the Elsa Server over HTTP. Good fit if you
                    want to host the Studio as a static frontend.
                  </p>
                </div>
              </div>
            </StepItem>

            {/* Step 5 */}
            <StepItem
              number={5}
              title="Point the Host at Your Elsa Server"
              description={
                <p>
                  Update the host's{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">appsettings.json</code>{" "}
                  (for the WASM host this lives under{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">wwwroot/appsettings.json</code>)
                  so the{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">Backend.Url</code>{" "}
                  matches your running Elsa Server's API base URL.
                </p>
              }
            >
              <CodeBlock code={backendConfig} language="json" title="appsettings.json" />
            </StepItem>

            {/* Step 6 */}
            <StepItem
              number={6}
              title="Run the Host"
              description="Start the Studio. Use the command for the host you chose."
            >
              <div className="space-y-4">
                <CodeBlock code={runServerHost} language="bash" title="Blazor Server host" />
                <CodeBlock code={runWasmHost} language="bash" title="Blazor WebAssembly host" />
              </div>
              <div className="mt-6 p-4 rounded-lg border bg-muted/30 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Open the URL printed in the terminal and sign in with the
                  default Elsa Server admin credentials:{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">admin</code> /{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">password</code>.
                </p>
              </div>
            </StepItem>

            {/* Next Steps */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Next Steps</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Button variant="outline" className="h-auto p-4 justify-start" asChild>
                  <a
                    href="https://github.com/elsa-workflows/elsa-studio/tree/release/3.6.1"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <BookOpen className="h-5 w-5 mr-3 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">elsa-studio repo (3.6.1)</p>
                      <p className="text-sm text-muted-foreground">
                        Hosts, modules and README
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
                        Customization and theming
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
