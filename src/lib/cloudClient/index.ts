/**
 * Typed cloud-bff client for the dashboard Cloud console.
 *
 * Types come from `@/lib/cloud` (the #53 / #44 action contract). App and test
 * code should import from this barrel. The production client invokes
 * `cloud-bff`; there is no fixture stub.
 */

export * from "@/lib/cloud";
export {
  CLOUD_APPLY_RELEASE,
  CLOUD_CREATE_ENGINE,
  CLOUD_DELETE_CONFIRM,
  CLOUD_DELETE_ENGINE,
  CLOUD_EMPTY_MESSAGE,
  CLOUD_ENGINE_NAME_LABEL,
  CLOUD_ENGINES_INTRO,
  CLOUD_ERROR_HEADING,
  CLOUD_ERROR_RETRY,
  CLOUD_LINK_CHECK_ERROR,
  CLOUD_LINK_ORG_ACTION,
  CLOUD_LINK_ORG_ASK_ADMIN,
  CLOUD_LINK_ORG_HEADING,
  CLOUD_LINK_ORG_MESSAGE,
  CLOUD_OPEN_LINK,
  CLOUD_OPEN_STUDIO,
  CLOUD_ORG_LINK_CONFLICT,
  CLOUD_PAGE_TITLE,
  CLOUD_PICK_ORG_HEADING,
  CLOUD_PICK_ORG_MESSAGE,
  CLOUD_PROVISIONING_HEADING,
  CLOUD_RESTART,
  CLOUD_RESTART_CONFIRM,
  CLOUD_SETUP_ACTION,
  CLOUD_SETUP_HEADING,
  CLOUD_SETUP_MESSAGE,
  CLOUD_STRUCTURED_LOGS,
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
