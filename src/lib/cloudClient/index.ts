/**
 * Typed cloud-bff client for the /cloud shell.
 *
 * Types come from `@/lib/cloud` (the #53 / #44 action contract). App and test
 * code should import from this barrel. The production client invokes
 * `cloud-bff`; there is no fixture stub.
 */

export * from "@/lib/cloud";
export {
  CLOUD_EMPTY_MESSAGE,
  CLOUD_ENGINES_INTRO,
  CLOUD_ERROR_HEADING,
  CLOUD_ERROR_RETRY,
  CLOUD_MANAGE_LINK,
  CLOUD_OPEN_LINK,
  CLOUD_PAGE_TITLE,
  CLOUD_SETUP_ACTION,
  CLOUD_SETUP_HEADING,
  CLOUD_SETUP_MESSAGE,
  CLOUD_UPDATING_HEADING,
  CLOUD_WORKSPACE_LABEL,
  cloudEngineCountLabel,
} from "./copy";
export { cloudClient } from "./client";
export { selectPreferredCloudWorkspace } from "./workspace";
export {
  clearCloudSetupMarker,
  hasCloudSetupMarker,
  setCloudSetupMarker,
} from "./setupMarker";
