import { useMemo, useState } from "react";
import JSZip from "jszip";
import { Highlight, themes } from "prism-react-renderer";
import { useRuntimeBuilder } from "@/lib/runtime-builder/store";
import {
  useCatalogQuery,
  useResolveQuery,
} from "@/lib/runtime-builder/catalog-client";
import { generateBundleFilesV2 } from "@/lib/runtime-builder/generate";
import { validateBuildV2 } from "@/lib/runtime-builder/validate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Check, Copy, Download, FileText, Loader2 } from "lucide-react";
import type { CatalogV2 } from "@/lib/runtime-builder/types-v2";

const EMPTY_CATALOG: CatalogV2 = { packages: [], infrastructureProviders: [] };

const languageMap: Record<string, string> = {
  json: "json",
  yaml: "yaml",
  ini: "bash",
  markdown: "markdown",
  text: "csharp",
};

export function StepBundle() {
  const { state } = useRuntimeBuilder();
  const { data: catalog } = useCatalogQuery();
  const { data: apiResolve } = useResolveQuery(state, true);
  const validation = useMemo(
    () => validateBuildV2(state, catalog ?? EMPTY_CATALOG, apiResolve),
    [state, catalog, apiResolve],
  );
  const files = useMemo(
    () => generateBundleFilesV2(state, catalog ?? EMPTY_CATALOG),
    [state, catalog],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [justCopied, setJustCopied] = useState(false);
  const { toast } = useToast();

  const active = files[activeIndex];

  async function copy() {
    await navigator.clipboard.writeText(active.contents);
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 1500);
  }

  function downloadFile() {
    const blob = new Blob([active.contents], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = active.path;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Deployment bundle
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Preview the files that will land in <code>deployment.zip</code>.
            Copy individual files now — packaging into a single zip ships next.
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button disabled className="opacity-70">
                    <Download className="mr-2 h-4 w-4" /> Download bundle
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Bundle generation lands next. Use the per-file copy/download for now.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {!validation.isValid && (
            <p className="text-[11px] text-destructive">
              Resolve {validation.errors.length} error
              {validation.errors.length === 1 ? "" : "s"} first.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav className="rounded-2xl border border-border/60 bg-card/40 p-2">
          {files.map((file, i) => (
            <button
              key={file.path}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs transition",
                activeIndex === i
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              <FileText className="h-3.5 w-3.5" />
              <span className="font-mono">{file.path}</span>
            </button>
          ))}
        </nav>

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40 backdrop-blur-xl">
          <header className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <code className="font-mono text-xs">{active.path}</code>
              <Badge variant="outline" className="border-border/50 text-[10px]">
                {active.language}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={copy}>
                {justCopied ? (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  downloadFile();
                  toast({ title: `Downloaded ${active.path}` });
                }}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Download
              </Button>
            </div>
          </header>

          <div className="max-h-[60vh] overflow-auto">
            <Highlight
              theme={themes.vsDark}
              code={active.contents}
              language={languageMap[active.language] ?? "text"}
            >
              {({ className, style, tokens, getLineProps, getTokenProps }) => (
                <pre
                  className={cn(
                    "m-0 p-4 font-mono text-[12px] leading-relaxed",
                    className,
                  )}
                  style={{ ...style, background: "transparent" }}
                >
                  {tokens.map((line, i) => (
                    <div key={i} {...getLineProps({ line })}>
                      <span className="mr-4 inline-block w-6 select-none text-right text-muted-foreground/40">
                        {i + 1}
                      </span>
                      {line.map((token, key) => (
                        <span key={key} {...getTokenProps({ token })} />
                      ))}
                    </div>
                  ))}
                </pre>
              )}
            </Highlight>
          </div>
        </div>
      </div>
    </div>
  );
}
