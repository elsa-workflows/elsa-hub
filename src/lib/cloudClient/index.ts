/**
 * Typed cloud-bff client for the /elsa-plus/cloud shell.
 *
 * Types come from `@/lib/cloud` (the #53 / #44 action contract). App and test
 * code should import from this barrel. The production client invokes
 * `cloud-bff`; there is no fixture stub.
 */

export * from "@/lib/cloud";
export {
  CLOUD_EMPTY_MESSAGE,
  CLOUD_ERROR_HEADING,
  CLOUD_ERROR_RETRY,
  CLOUD_SETUP_ACTION,
  CLOUD_SETUP_HEADING,
  CLOUD_SETUP_MESSAGE,
  CLOUD_UPDATING_HEADING,
} from "./copy";
export { cloudClient } from "./client";
export { selectPreferredCloudWorkspace } from "./workspace";
export {
  clearCloudSetupMarker,
  hasCloudSetupMarker,
  setCloudSetupMarker,
} from "./setupMarker";
