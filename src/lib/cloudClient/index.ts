/**
 * Typed cloud-bff client for the /cloud shell.
 *
 * Types are a temporary mirror of elsa-hub#53 (`src/lib/cloud`). After #53
 * merges, replace the contract export with:
 *
 *   export * from "@/lib/cloud";
 *
 * Switching the transport to the real Edge Function is the one-line change in
 * `client.ts`.
 */

export * from "./contract";
export { CLOUD_EMPTY_MESSAGE, CLOUD_UPDATING_HEADING } from "./copy";
export { cloudClient } from "./client";
export { bffCloudClient } from "./bff";
export {
  getCloudStubScenario,
  setCloudStubScenario,
  stubCloudClient,
  STUB_ENGINES,
  STUB_ENGINE_OVERVIEWS,
  STUB_WORKSPACE,
  type CloudStubScenario,
} from "./stub";
