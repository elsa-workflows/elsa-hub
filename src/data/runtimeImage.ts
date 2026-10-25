/**
 * Elsa+ Runtime (Valence) Docker image tag.
 *
 * Distinct from ELSA_VERSION / ELSA_LATEST_STABLE_VERSION, which pin the
 * Elsa NuGet packages and Get Started guides. This constant is the image
 * tag visitors see on Elsa+ Runtime pages (copy, tag-table examples, pins).
 *
 * Studio and Core both ship 3.9.0, so one tag covers server, Studio, and
 * combined. Docker run / compose quickstarts still use `:latest`, which
 * currently has the same digest as 3.9.0. Image names stay as published:
 *   ghcr.io/valence-works/runtime-ce-{server,studio,combined}:3.9.0
 *   valenceruntimeimages.azurecr.io/runtime-{server,studio,combined}:3.9.0
 *
 * Paid ACR also publishes the immutable pin 3.9.0-build.209; mention that
 * only where a page already shows a pinned build.
 */
export const RUNTIME_IMAGE_TAG = "3.9.0";

export const RUNTIME_IMAGE_LINE = "3.9";
