import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "./CodeBlock";

interface DockerSectionProps {
  title: string;
  description: string;
  pullCommand: string;
  runCommand: string;
  accessUrl: string;
  credentials?: { username: string; password: string };
  swaggerUrl?: string;
  note?: ReactNode;
  badge?: string;
}

export function DockerSection({
  title,
  description,
  pullCommand,
  runCommand,
  accessUrl,
  credentials,
  swaggerUrl,
  note,
  badge,
}: DockerSectionProps) {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-muted-foreground mt-1">{description}</p>
        </div>
        {badge && (
          <Badge variant="secondary" className="shrink-0">
            {badge}
          </Badge>
        )}
      </div>

      {note && (
        <div className="rounded-md bg-muted/50 border border-border/50 p-4 text-sm">
          {note}
        </div>
      )}

      <div className="space-y-3">
        <CodeBlock code={pullCommand} language="bash" title="Pull the image" />
        <CodeBlock code={runCommand} language="bash" title="Run the container" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <div>
          <p className="text-sm font-medium mb-1">Access URL</p>
          <a
            href={accessUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            {accessUrl}
          </a>
        </div>
        {swaggerUrl && (
          <div>
            <p className="text-sm font-medium mb-1">Swagger UI</p>
            <a
              href={swaggerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              {swaggerUrl}
            </a>
          </div>
        )}
        {credentials && (
          <div>
            <p className="text-sm font-medium mb-1">Default Credentials</p>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                {credentials.username}
              </span>{" "}
              /{" "}
              <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                {credentials.password}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
