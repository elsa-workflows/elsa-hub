import { useMemo, useState } from "react";
import { ImagePickerCard } from "./ImagePickerCard";
import { useRuntimeBuilder } from "@/lib/runtime-builder/store";
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

export function StepImage() {
  const { catalog, state, setImage } = useRuntimeBuilder();
  const [pendingImage, setPendingImage] = useState<{ id: string; version: string } | null>(null);

  const versionByImage = useMemo(() => {
    const map: Record<string, string> = {};
    for (const image of catalog.images) {
      map[image.id] =
        state.imageId === image.id
          ? state.imageVersion ?? image.versions[0]
          : image.versions[0];
    }
    return map;
  }, [catalog.images, state.imageId, state.imageVersion]);

  function handleSelect(id: string, version: string) {
    if (state.imageId === id) {
      setImage(id, version);
      return;
    }
    if (state.capabilityIds.length > 0) {
      setPendingImage({ id, version });
      return;
    }
    setImage(id, version);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Pick a runtime image
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          The image determines which capabilities and versions are available
          downstream. You can change it later, but capabilities incompatible
          with the new image will be removed.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {catalog.images.map((image) => (
          <ImagePickerCard
            key={image.id}
            image={image}
            selected={state.imageId === image.id}
            selectedVersion={versionByImage[image.id]}
            onSelect={(version) => handleSelect(image.id, version)}
            onChangeVersion={(version) => {
              if (state.imageId === image.id) {
                setImage(image.id, version);
              }
              versionByImage[image.id] = version;
            }}
          />
        ))}
      </div>

      <AlertDialog
        open={pendingImage !== null}
        onOpenChange={(open) => !open && setPendingImage(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch runtime image?</AlertDialogTitle>
            <AlertDialogDescription>
              Capabilities not supported by the new image will be removed from
              your build, along with any settings you configured for them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep current image</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingImage) setImage(pendingImage.id, pendingImage.version);
                setPendingImage(null);
              }}
            >
              Switch image
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
