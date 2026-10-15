/**
 * Typed cloud-bff client for the /cloud shell.
 *
 * Types come from `@/lib/cloud` (the #53 / #44 action contract). App code
 * should import from this barrel, not from `./contract`, `./client`, or
 * `./stub`. The stub is test/DEV-only and is not re-exported here.
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
