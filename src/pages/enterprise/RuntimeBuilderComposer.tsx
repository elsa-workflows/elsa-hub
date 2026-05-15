import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { useRuntimeBuilder } from "@/lib/runtime-builder/store";
import { Stepper } from "@/components/runtime-builder/Stepper";
import { BuildSummary } from "@/components/runtime-builder/BuildSummary";
import { StepImage } from "@/components/runtime-builder/StepImage";
import { StepCapabilities } from "@/components/runtime-builder/StepCapabilities";
import { StepConfigure } from "@/components/runtime-builder/StepConfigure";
import { StepValidate } from "@/components/runtime-builder/StepValidate";
import { StepBundle } from "@/components/runtime-builder/StepBundle";
import { ImportDialog } from "@/components/runtime-builder/ImportDialog";
import { ExportDialog } from "@/components/runtime-builder/ExportDialog";

const STEPS = [
  { id: 1, label: "Runtime image", short: "Image" },
  { id: 2, label: "Capabilities", short: "Capabilities" },
  { id: 3, label: "Configure", short: "Configure" },
  { id: 4, label: "Validate", short: "Validate" },
  { id: 5, label: "Bundle", short: "Bundle" },
];

export default function RuntimeBuilderComposer() {
  const [params, setParams] = useSearchParams();
  const { state, catalog, setImage, setAdvancedMode, reset } = useRuntimeBuilder();
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const step = clamp(Number(params.get("step") ?? "1"), 1, 5);

  // Pre-select an image from `?image=` if recognized and none chosen yet.
  useEffect(() => {
    const requested = params.get("image");
    if (!requested || state.imageId) return;
    if (catalog.images.some((i) => i.id === requested)) {
      setImage(requested);
    }
  }, [params, state.imageId, catalog.images, setImage]);

  const furthestUnlocked = state.imageId
    ? state.capabilityIds.length > 0
      ? 5
      : 2
    : 1;

  function goTo(id: number) {
    setParams({ step: String(id) }, { replace: false });
  }

  useEffect(() => {
    if (step > furthestUnlocked) {
      setParams({ step: String(furthestUnlocked) }, { replace: true });
    }
  }, [step, furthestUnlocked, setParams]);

  return (
    <Layout>
      <Seo
        path="/elsa-plus/runtime-builder/new"
        title="Elsa Runtime Builder — compose & deploy"
        description="Visually compose an Elsa runtime, configure capabilities, validate compatibility, and preview a Docker deployment bundle."
      />

      <section className="border-b border-border/50 bg-background/60 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
              >
                <Link to="/elsa-plus/runtime-builder">
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  Builder
                </Link>
              </Button>
              <span className="hidden text-muted-foreground/40 md:inline">/</span>
              <h1 className="font-display text-base font-semibold tracking-tight">
                Compose runtime
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Stepper
                steps={STEPS}
                active={step}
                furthestUnlocked={furthestUnlocked}
                onSelect={goTo}
              />
              <div className="flex items-center gap-2 rounded-full border border-border/50 px-3 py-1.5">
                <Switch
                  id="advanced"
                  checked={state.advancedMode}
                  onCheckedChange={setAdvancedMode}
                />
                <Label
                  htmlFor="advanced"
                  className="cursor-pointer text-xs text-muted-foreground"
                >
                  Advanced
                </Label>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setResetOpen(true)}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            {step === 1 && <StepImage />}
            {step === 2 && <StepCapabilities />}
            {step === 3 && <StepConfigure />}
            {step === 4 && <StepValidate />}
            {step === 5 && <StepBundle />}

            <div className="mt-10 flex items-center justify-between border-t border-border/40 pt-5">
              <Button
                variant="outline"
                disabled={step === 1}
                onClick={() => goTo(step - 1)}
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
              </Button>
              <Button
                disabled={step === 5 || step >= furthestUnlocked}
                onClick={() => goTo(step + 1)}
              >
                Continue <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <BuildSummary
              onOpenImport={() => setImportOpen(true)}
              onOpenExport={() => setExportOpen(true)}
            />
          </div>
        </div>
      </section>

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset this build?</AlertDialogTitle>
            <AlertDialogDescription>
              All capabilities and settings will be cleared. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep build</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                reset();
                goTo(1);
              }}
            >
              Reset everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

function clamp(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}
