import { CodeBlock } from "@/components/get-started";

export function ConfigJsonExplainer({ image }: { image: string }) {
  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold">
        Configuration via mounted <code className="font-mono">config.json</code>
      </h2>
      <p className="text-muted-foreground">
        Both Elsa Pro services load an optional JSON file from{" "}
        <code className="font-mono">/config/config.json</code> inside the container. This avoids long lists of{" "}
        <code className="font-mono">-e</code> flags and keeps secrets out of the process environment.
      </p>
      <div className="rounded-lg border bg-card p-5">
        <p className="font-medium mb-2">Configuration precedence (last wins):</p>
        <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
          <li><code className="font-mono">appsettings.json</code> (baked into the image)</li>
          <li><code className="font-mono">appsettings.{"{Environment}"}.json</code> (baked into the image)</li>
          <li><code className="font-mono">/config/config.json</code> (your mount)</li>
          <li>Environment variables (highest precedence)</li>
        </ol>
      </div>
      <CodeBlock
        code={`docker run ... -v $(pwd)/config.json:/config/config.json ${image}:latest`}
        language="bash"
        title="Mount your config file"
      />
      <p className="text-sm text-muted-foreground">
        An annotated <code className="font-mono">config.example.json</code> ships in the source repository — copy it,
        remove the comments, and mount it as above.
      </p>
    </div>
  );
}
