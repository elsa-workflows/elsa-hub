export const ELSA_RUNTIME_NAME = "Elsa Runtime";
export const ELSA_RUNTIME_PROVIDER = "Valence Works";
export const ELSA_RUNTIME_DISPLAY_NAME = `${ELSA_RUNTIME_NAME} by ${ELSA_RUNTIME_PROVIDER}`;
export const ELSA_RUNTIME_SUBTITLE = "Ready-to-deploy Elsa Server and Studio Docker images.";

export const ELSA_RUNTIME_PATH = "/elsa-plus/elsa-runtime";
export const LEGACY_VALENCE_RUNTIME_PATH = "/elsa-plus/valence-runtime";

export function elsaRuntimeImagePath(slug: string) {
  return `${ELSA_RUNTIME_PATH}/images/${slug}`;
}

export function getLegacyElsaRuntimeRedirectTarget(location: {
  pathname: string;
  search: string;
  hash: string;
}) {
  const pathname = location.pathname.replace(
    new RegExp(`^${LEGACY_VALENCE_RUNTIME_PATH}`),
    ELSA_RUNTIME_PATH,
  );

  return `${pathname}${location.search}${location.hash}`;
}
