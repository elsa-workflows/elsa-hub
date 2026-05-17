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
import { useCatalogQuery } from "@/lib/runtime-builder/catalog-client";
import { Stepper } from "@/components/runtime-builder/Stepper";
import { BuildSummary } from "@/components/runtime-builder/BuildSummary";
import { StepSources } from "@/components/runtime-builder/StepSources";
import { StepPackages } from "@/components/runtime-builder/StepPackages";
import { StepFeatures } from "@/components/runtime-builder/StepFeatures";
import { StepInfrastructure } from "@/components/runtime-builder/StepInfrastructure";
import { StepConfigure } from "@/components/runtime-builder/StepConfigure";
import { StepValidate } from "@/components/runtime-builder/StepValidate";
import { StepBundle } from "@/components/runtime-builder/StepBundle";
import { ImportDialog } from "@/components/runtime-builder/ImportDialog";
import { ExportDialog } from "@/components/runtime-builder/ExportDialog";
import { PreviewBanner } from "@/components/runtime-builder/PreviewBanner";
import { PreviewBadge } from "@/components/runtime-builder/PreviewBadge";

const STEPS = [
  { id: 1, label: "Sources", short: "Sources" },
  { id: 2, label: "Packages", short: "Packages" },
  { id: 3, label: "Features", short: "Features" },
  { id: 4, label: "Infrastructure", short: "Infra" },
  { id: 5, label: "Configure", short: "Configure" },
  { id: 6, label: "Validate", short: "Validate" },
  { id: 7, label: "Bundle", short: "Bundle" },
];
const MAX_STEP = STEPS.length;

export default function RuntimeBuilderComposer() {
  const [params, setParams] = useSearchParams();
  const { state, setAdvancedMode, reset, togglePackage } = useRuntimeBuilder();
  const { data: catalog } = useCatalogQuery();
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const step = clamp(Number(params.get("step") ?? "1"), 1, MAX_STEP);

  // Pre-select a package from `?package=<id>` if recognized and none chosen.
  useEffect(() => {
    const requested = params.get("package");
    if (!requested || !catalog) return;
    if (state.selectedPackages.some((p) => p.packageId === requested)) return;
    const pkg = catalog.packages.find((p) => p.id === requested);
    if (pkg) togglePackage(pkg.id, pkg.version, catalog);
  }, [params, catalog, state.selectedPackages, togglePackage]);

  const hasPackages = state.selectedPackages.length > 0;
  const hasFeatures = state.selectedPackages.some(
    (p) => p.selectedFeatures.length > 0,
  );
  const furthestUnlocked = !hasPackages
    ? 2
    : !hasFeatures
      ? 3
      : MAX_STEP;

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
        title="Elsa Runtime Builder (Preview) — compose & deploy"
        description="An early concept of the Elsa Runtime Builder composer. Pick packages and infrastructure, validate compatibility, and preview a Docker deployment bundle."
        noIndex
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
              <PreviewBadge />
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

      <section className="container mx-auto px-4 pt-6">
        <PreviewBanner compact />
      </section>

      <section className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            {step === 1 && <StepSources />}
            {step === 2 && <StepPackages />}
            {step === 3 && <StepFeatures />}
            {step === 4 && <StepInfrastructure />}
            {step === 5 && <StepConfigure />}
            {step === 6 && <StepValidate />}
            {step === 7 && <StepBundle />}

            <div className="mt-10 flex items-center justify-between border-t border-border/40 pt-5">
              <Button
                variant="outline"
                disabled={step === 1}
                onClick={() => goTo(step - 1)}
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
              </Button>
              <Button
                disabled={step === MAX_STEP || step >= furthestUnlocked}
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
              All packages, features, and infrastructure choices will be
              cleared. This cannot be undone.
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
