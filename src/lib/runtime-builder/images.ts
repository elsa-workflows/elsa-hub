// Builder-friendly view over the curated Docker image catalog in
// `src/data/dockerImages.ts`. Keeps the Runtime Builder decoupled from the
// docs/marketing fields on `DockerImage`.

import { dockerImages, type DockerImage } from "@/data/dockerImages";

export type BuilderImageRole = "server" | "studio" | "combined";

export interface BuilderImage {
  slug: string;
  name: string;
  tagline: string;
  /** Docker image name without tag (e.g. `valenceworks/elsa-pro-server`). */
  image: string;
  role: BuilderImageRole;
  defaultHostPort: number;
  containerPort: number;
  containerName: string;
  needsSharedNetwork: boolean;
  requiresServer: boolean;
  /** Default env vars (key + example value). */
  envDefaults: { key: string; value: string; required: boolean }[];
  dockerHubUrl: string;
}

function roleFromSlug(slug: string): BuilderImageRole {
  if (slug.endsWith("-studio")) return "studio";
  if (slug.endsWith("-combined")) return "combined";
  return "server";
}

/**
 * Catalog-level default for an image env var. Returns a value that may contain
 * `{hostPort}` placeholders; resolve with `resolveEnvDefault`.
 */
function defaultValueFor(key: string, example: string | undefined): string {
  // Backend__Url must reflect the actual host port the container publishes.
  if (key === "Backend__Url") return "http://localhost:{hostPort}/elsa/api";
  return example ?? "";
}

export function resolveEnvDefault(template: string, hostPort: number): string {
  return template.replace(/\{hostPort\}/g, String(hostPort));
}

function toBuilderImage(src: DockerImage): BuilderImage {
  return {
    slug: src.slug,
    name: src.name,
    tagline: src.tagline,
    image: src.image,
    role: roleFromSlug(src.slug),
    defaultHostPort: src.hostPort,
    containerPort: src.defaultPort,
    containerName: src.containerName,
    needsSharedNetwork: src.needsSharedNetwork,
    requiresServer: Boolean(src.requiresServer),
    envDefaults: src.envVars.map((e) => ({
      key: e.key,
      value: defaultValueFor(e.key, e.example),
      required: Boolean(e.required),
      description: e.description,
    })),
    dockerHubUrl: src.dockerHubUrl,
  };
}

export const RUNTIME_BUILDER_IMAGES: BuilderImage[] = dockerImages.map(
  toBuilderImage,
);

export const DEFAULT_IMAGE_SLUG = "elsa-pro-combined";

export function findBuilderImage(slug: string): BuilderImage | undefined {
  return RUNTIME_BUILDER_IMAGES.find((i) => i.slug === slug);
}

/** Server companion used when the user picks Studio alone. */
export function serverCompanionFor(image: BuilderImage): BuilderImage | null {
  if (image.role !== "studio") return null;
  return findBuilderImage("elsa-pro-server") ?? null;
}
