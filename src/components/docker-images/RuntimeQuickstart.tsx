import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Copy, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getRuntimeQuickstart, quickstartChoices, type QuickstartImage, type QuickstartFormat } from "@/data/runtimeQuickstart";

function Command({ code, title }: { code: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-3 border-b bg-muted/50 px-4 py-2">
        <span className="text-sm font-mono">{title}</span>
        <Button size="icon" variant="ghost" aria-label={`Copy ${title}`} title={`Copy ${title}`} onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setError(false);
            window.setTimeout(() => setCopied(false), 2000);
          } catch { setError(true); }
        }}>
          {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <pre className="max-w-full overflow-x-auto p-4 text-sm leading-6"><code>{code}</code></pre>
      <span role="status" className={error ? "block px-4 pb-3 text-sm text-destructive" : "sr-only"}>
        {error ? "Clipboard unavailable. Select and copy the command." : copied ? "Copied" : ""}
      </span>
    </div>
  );
}

export function RuntimeQuickstart() {
  const [image, setImage] = useState<QuickstartImage>("combined");
  const [format, setFormat] = useState<QuickstartFormat>("run");
  const quickstart = getRuntimeQuickstart(image, format);
  const choice = quickstartChoices.find((item) => item.id === image);
  return (
    <section id="quickstart" className="pb-12 md:pb-16 scroll-mt-24">
      <div className="container max-w-5xl space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3"><Terminal className="h-6 w-6 text-primary shrink-0" />Run Elsa locally</h2>
          <p className="text-muted-foreground">Free Community images on GitHub Container Registry. No signup or registry login.</p>
          <p className="text-sm text-muted-foreground">Docker running locally and a Bash-compatible terminal with OpenSSL are required.</p>
        </div>
        <div className="space-y-4 min-w-0">
          <div className="flex flex-wrap justify-between gap-3">
            <Tabs value={image} onValueChange={(value) => { if (value === "combined" || value === "server" || value === "studio") setImage(value); }}>
              <TabsList aria-label="Image deployment">
                {quickstartChoices.map((item) => <TabsTrigger key={item.id} value={item.id}>{item.label}</TabsTrigger>)}
              </TabsList>
            </Tabs>
            <Tabs value={format} onValueChange={(value) => { if (value === "run" || value === "compose") setFormat(value); }}>
              <TabsList aria-label="Command format"><TabsTrigger value="run">docker run</TabsTrigger><TabsTrigger value="compose">Compose</TabsTrigger></TabsList>
            </Tabs>
          </div>
          <p className="text-sm text-muted-foreground">{choice?.description}</p>
          <Command key={`${image}-${format}`} code={quickstart.code} title={format === "run" ? "Terminal" : "compose.yaml"} />
          {format === "compose" && <><p className="text-sm text-muted-foreground">Save as <code>compose.yaml</code>, then start from the same directory:</p><Command code={quickstart.startCommand} title="Start containers" /></>}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-y py-4">
          <Button variant="outline" className="gap-2" asChild><a href={quickstart.accessUrl} target="_blank" rel="noopener noreferrer">{quickstart.accessLabel}<ArrowRight className="h-4 w-4" /></a></Button>
          <span className="text-sm font-mono break-all">{quickstart.accessUrl}</span>
          {image !== "server" && <p className="text-sm text-muted-foreground">Sign in: <code>admin</code> / <code>ChangeThisPassword123!</code></p>}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">Local evaluation only: ports are bound to your computer, the password is a sample, and SQLite data is lost when the container is removed. A fresh signing key is generated for this run. Before deploying, configure your own credentials, HTTPS and persistent storage. <a href="https://github.com/valence-works/runtime/wiki/Production-Checklist" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Production checklist</a>.</p>
        <details className="border-b pb-4">
          <summary className="cursor-pointer text-sm font-medium">Check readiness &amp; stop containers</summary>
          <div className="space-y-3 pt-4">
            <Command code={quickstart.healthCommand} title="Readiness check" />
            <p className="text-sm text-muted-foreground">Wait for startup, then check for a successful response. If it fails, review <code>docker logs {image === "combined" ? "elsa-combined" : "elsa-server"}</code>{format === "compose" ? " (use docker compose logs for Compose)" : ""}.</p>
            <Command code={quickstart.cleanupCommand} title="Stop and remove" />
          </div>
        </details>
        <Button asChild variant="link" className="px-0 gap-2"><Link to={`/elsa-plus/elsa-runtime/images/runtime-${image}`}>Full image configuration<ArrowRight className="h-4 w-4" /></Link></Button>
      </div>
    </section>
  );
}