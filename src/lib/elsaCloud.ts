export const ELSA_CLOUD_PATH = "/elsa-plus/cloud";
export const LEGACY_CLOUD_PATH = "/cloud";
export const ELSA_CLOUD_LEGAL_PATH = `${ELSA_CLOUD_PATH}/legal`;

export const ELSA_CLOUD_LEGAL_PAGES = {
  terms: `${ELSA_CLOUD_LEGAL_PATH}/terms`,
  privacy: `${ELSA_CLOUD_LEGAL_PATH}/privacy`,
  dpa: `${ELSA_CLOUD_LEGAL_PATH}/dpa`,
  subprocessors: `${ELSA_CLOUD_LEGAL_PATH}/subprocessors`,
} as const;

export type ElsaCloudLegalPage = keyof typeof ELSA_CLOUD_LEGAL_PAGES;

export function elsaCloudEnginePath(engineId: string) {
  return `${ELSA_CLOUD_PATH}/engines/${engineId}`;
}

export function elsaCloudLegalPath(page: ElsaCloudLegalPage) {
  return ELSA_CLOUD_LEGAL_PAGES[page];
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
