/**
 * Elsa+ Runtime (Valence) Docker image tag.
 *
 * Distinct from ELSA_VERSION / ELSA_LATEST_STABLE_VERSION, which pin the
 * Elsa NuGet packages and Get Started guides. This constant is the image
 * tag visitors see on Elsa+ Runtime pages (copy, tag-table examples).
 *
 * Docker run / compose snippets still use `:latest` (a moving tag, not a
 * 3.8 pin). Image names stay as published:
 *   ghcr.io/valence-works/runtime-ce-{server,studio,combined}
 *   valenceruntimeimages.azurecr.io/runtime-{server,studio,combined}
 *
 * TODO: confirm against published tag
 */
export const RUNTIME_IMAGE_TAG = "3.9.0";

/** Major.minor line derived from RUNTIME_IMAGE_TAG (e.g. "3.9"). */
export const RUNTIME_IMAGE_LINE = RUNTIME_IMAGE_TAG.split(".").slice(0, 2).join(".");
