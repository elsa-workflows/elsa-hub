import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useRuntimeBuilder } from "@/lib/runtime-builder/store";
import type { BuilderStateV2 } from "@/lib/runtime-builder/types-v2";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportDialog({ open, onOpenChange }: Props) {
  const { importState } = useRuntimeBuilder();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  function applyText(value: string) {
    try {
      const parsed = JSON.parse(value);
      const incoming: Partial<BuilderStateV2> = {
        schemaVersion: 2,
        packageSources: Array.isArray(parsed.packageSources)
          ? parsed.packageSources
          : undefined,
        selectedPackages: Array.isArray(parsed.selectedPackages)
          ? parsed.selectedPackages
          : [],
        infrastructureSelections: Array.isArray(parsed.infrastructureSelections)
          ? parsed.infrastructureSelections
          : [],
        advancedMode: Boolean(parsed.advancedMode),
        meta: parsed.meta,
      };
      importState(incoming);
      toast({ title: "Configuration imported" });
      onOpenChange(false);
      setText("");
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: error instanceof Error ? error.message : "Unable to parse",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import build configuration</DialogTitle>
          <DialogDescription>
            Paste JSON exported from the Runtime Builder, or load a file.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Preview schema.</span>{" "}
          Configs follow{" "}
          <code className="font-mono">elsa-runtime-builder/v2</code> and may
          change as the catalog leaves preview.
        </div>

        <div className="space-y-3">
          <div>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setText(String(reader.result ?? ""));
                reader.readAsText(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInput.current?.click()}
            >
              Load from file
            </Button>
          </div>

          <Textarea
            rows={12}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='{"schemaVersion":2,"selectedPackages":[...]}'
            className="font-mono text-xs"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!text.trim()} onClick={() => applyText(text)}>
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
