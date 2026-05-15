import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Highlight, themes } from "prism-react-renderer";
import { useRuntimeBuilder } from "@/lib/runtime-builder/store";
import { Check, Copy, Download } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({ open, onOpenChange }: Props) {
  const { state } = useRuntimeBuilder();
  const [copied, setCopied] = useState(false);

  const json = useMemo(
    () =>
      JSON.stringify(
        {
          $schema: "elsa-runtime-builder/v2",
          exportedAt: new Date().toISOString(),
          ...state,
        },
        null,
        2,
      ),
    [state],
  );

  async function copy() {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function download() {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "elsa-runtime-build.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export build configuration</DialogTitle>
          <DialogDescription>
            Save your build as JSON. Re-import any time to restore the exact
            same selections and settings.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Preview schema.</span>{" "}
          The exported config follows{" "}
          <code className="font-mono">elsa-runtime-builder/v2</code>.
        </div>

        <div className="max-h-[55vh] overflow-auto rounded-lg border border-border/60 bg-background/60">
          <Highlight theme={themes.vsDark} code={json} language="json">
            {({ className, style, tokens, getLineProps, getTokenProps }) => (
              <pre
                className={`m-0 p-4 font-mono text-[12px] leading-relaxed ${className}`}
                style={{ ...style, background: "transparent" }}
              >
                {tokens.map((line, i) => (
                  <div key={i} {...getLineProps({ line })}>
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </div>
                ))}
              </pre>
            )}
          </Highlight>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={copy}>
            {copied ? (
              <>
                <Check className="mr-1.5 h-4 w-4" /> Copied
              </>
            ) : (
              <>
                <Copy className="mr-1.5 h-4 w-4" /> Copy
              </>
            )}
          </Button>
          <Button onClick={download}>
            <Download className="mr-1.5 h-4 w-4" /> Download JSON
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
