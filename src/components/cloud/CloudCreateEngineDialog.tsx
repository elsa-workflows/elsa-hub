import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CLOUD_TAP_TARGET } from "@/lib/cloud/actionClass";
import {
  buildCreateEngineIntent,
  onboardingChoices,
  slugifyEngineName,
} from "@/lib/cloud";
import {
  CLOUD_CREATE_ENGINE,
  CLOUD_ENGINE_NAME_LABEL,
  isCloudBffError,
  isCloudLimitReached,
  isCloudUpdating,
  type CloudBffResponse,
  type CloudOnboardingOptions,
} from "@/lib/cloudClient";
import { useCloudConsolePaths } from "@/lib/cloudPaths";
import { cn } from "@/lib/utils";

export function CloudCreateEngineDialog({
  options,
  disabled,
  creating,
  onCreate,
}: {
  options: CloudOnboardingOptions;
  disabled: boolean;
  creating: boolean;
  onCreate: (input: {
    name: string;
    slug: string;
    intent: ReturnType<typeof buildCreateEngineIntent>;
    idempotencyKey: string;
  }) => Promise<CloudBffResponse>;
}) {
  const navigate = useNavigate();
  const { engine: enginePath } = useCloudConsolePaths();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const slug = slugifyEngineName(name);
  const choices = onboardingChoices(options);
  const selected = choices[0];

  async function submit() {
    if (disabled || !selected || !name.trim() || !slug) return;
    setError(null);
    const result = await onCreate({
      name: name.trim(),
      slug,
      intent: buildCreateEngineIntent(selected, options),
      idempotencyKey: crypto.randomUUID(),
    });
    if (isCloudUpdating(result) || isCloudLimitReached(result) || isCloudBffError(result)) {
      setError(result.error);
      return;
    }
    if (result.ok && "engine" in result && result.engine) {
      setOpen(false);
      navigate(enginePath(result.engine.id));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={cn(CLOUD_TAP_TARGET)} disabled={disabled || !selected}>
          {CLOUD_CREATE_ENGINE}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{CLOUD_CREATE_ENGINE}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="cloud-engine-name">{CLOUD_ENGINE_NAME_LABEL}</Label>
            <Input
              id="cloud-engine-name"
              className={CLOUD_TAP_TARGET}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
            />
          </div>
          {slug && <p className="text-sm text-muted-foreground">{slug}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            className={cn(CLOUD_TAP_TARGET)}
            disabled={disabled || creating || !selected || !slug}
            onClick={() => void submit()}
          >
            {CLOUD_CREATE_ENGINE}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
