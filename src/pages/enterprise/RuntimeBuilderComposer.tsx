import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
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
import { Stepper } from "@/components/runtime-builder/Stepper";
import { PreviewBanner } from "@/components/runtime-builder/PreviewBanner";
import { PreviewBadge } from "@/components/runtime-builder/PreviewBadge";
import {
  ConfiguratorProvider,
  useConfigurator,
} from "@/lib/runtime-builder/configurator-store";
import { useControlCatalog } from "@/lib/runtime-builder/control-api";
import { StepRuntime } from "@/components/runtime-builder/configurator/StepRuntime";
import { StepFeatures } from "@/components/runtime-builder/configurator/StepFeatures";
import { StepSettings } from "@/components/runtime-builder/configurator/StepSettings";
import { StepInfrastructure } from "@/components/runtime-builder/configurator/StepInfrastructure";
import { StepReview } from "@/components/runtime-builder/configurator/StepReview";
import { ConfiguratorSummary } from "@/components/runtime-builder/configurator/ConfiguratorSummary";

const STEPS = [
  { id: 1, key: "runtime", label: "Runtime", short: "Runtime" },
  { id: 2, key: "features", label: "Features", short: "Features" },
  { id: 3, key: "settings", label: "Settings", short: "Settings" },
  { id: 4, key: "infrastructure", label: "Infrastructure", short: "Infra" },
  { id: 5, key: "review", label: "Review", short: "Review" },
] as const;

export default function RuntimeBuilderComposer() {
  return (
    <ConfiguratorProvider>
      <ComposerInner />
    </ConfiguratorProvider>
  );
}

function ComposerInner() {
  const [params, setParams] = useSearchParams();
  const { state, setImage, reset } = useConfigurator();
  const { data: catalog } = useControlCatalog();
  const [resetOpen, setResetOpen] = useState(false);

  const maxStep = STEPS.length;
  const step = clamp(Number(params.get("step") ?? "1"), 1, maxStep);
  const activeKey = STEPS[step - 1]?.key ?? "runtime";

  // Pre-select the runtime image from `?image=<slug>` (once, on first load).
  const appliedImageRef = useRef<string | null>(null);
  useEffect(() => {
    const requested = params.get("image");
    if (!requested || !catalog || appliedImageRef.current === requested) return;
    const image = catalog.images.find((i) => i.slug === requested);
    if (!image) return;
    appliedImageRef.current = requested;
    setImage(image);
  }, [params, catalog, setImage]);

  const hasImage = Boolean(state.imageSlug);
  const hasFeatures = Object.keys(state.features).length > 0;
  const furthestUnlocked = !hasImage ? 1 : !hasFeatures ? 2 : maxStep;

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
        description="Compose an Elsa runtime against the live package catalog: pick a runtime image, enable features, configure settings and infrastructure, then download a deployment bundle."
        noIndex
      />

      <section className="border-b border-border/50 bg-background/60 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
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
                steps={STEPS as unknown as { id: number; label: string; short: string }[]}
                active={step}
                furthestUnlocked={furthestUnlocked}
                onSelect={goTo}
              />
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
            {activeKey === "runtime" && <StepRuntime />}
            {activeKey === "features" && <StepFeatures />}
            {activeKey === "settings" && <StepSettings />}
            {activeKey === "infrastructure" && <StepInfrastructure />}
            {activeKey === "review" && <StepReview />}

            <div className="mt-10 flex items-center justify-between border-t border-border/40 pt-5">
              <Button variant="outline" disabled={step === 1} onClick={() => goTo(step - 1)}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
              </Button>
              <Button
                disabled={step === maxStep || step >= furthestUnlocked}
                onClick={() => goTo(step + 1)}
              >
                Continue <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <ConfiguratorSummary />
          </div>
        </div>
      </section>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset this configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              The runtime, features, settings and infrastructure choices will be cleared.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
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
