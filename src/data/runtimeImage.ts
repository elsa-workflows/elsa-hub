/**
 * Elsa+ Runtime (Valence) Docker image tag.
 *
 * Distinct from ELSA_VERSION / ELSA_LATEST_STABLE_VERSION, which pin the
 * Elsa NuGet packages and Get Started guides. This constant is the image
 * tag visitors see on Elsa+ Runtime pages (copy, tag-table examples, pins).
 *
 * The server, studio and combined images all share this tag; they are built
 * from the same Elsa version. Docker run / compose quickstarts still use
 * `:latest`. Image names stay as published:
 *   ghcr.io/valence-works/runtime-ce-{server,studio,combined}:<tag>
 *   valenceruntimeimages.azurecr.io/runtime-{server,studio,combined}:<tag>
 *
 * Community GHCR publishes only `latest` and this tag. Paid ACR also
 * publishes `sha-<commit>` and `<tag>-build.N`.
 */
export const RUNTIME_IMAGE_TAG = "3.9.0";

/** major.minor of RUNTIME_IMAGE_TAG — do not set this separately. */
export function runtimeImageLineFromTag(tag: string): string {
  return tag.split(".").slice(0, 2).join(".");
}

export const RUNTIME_IMAGE_LINE = runtimeImageLineFromTag(RUNTIME_IMAGE_TAG);

export const RUNTIME_IMAGES_SHARE_TAG_COPY =
  `The server, studio and combined images all share one tag — they're all built from Elsa ${RUNTIME_IMAGE_TAG}.`;
