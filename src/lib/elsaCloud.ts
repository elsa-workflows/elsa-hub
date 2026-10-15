export const ELSA_CLOUD_PATH = "/elsa-plus/cloud";
export const LEGACY_CLOUD_PATH = "/cloud";

export function elsaCloudEnginePath(engineId: string) {
  return `${ELSA_CLOUD_PATH}/engines/${engineId}`;
}

export function getLegacyCloudRedirectTarget(location: {
  pathname: string;
  search: string;
  hash: string;
}) {
  const pathname = location.pathname.replace(
    new RegExp(`^${LEGACY_CLOUD_PATH}(?=/|$)`),
    ELSA_CLOUD_PATH,
  );

  return `${pathname}${location.search}${location.hash}`;
}
