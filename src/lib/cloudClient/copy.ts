/** UI copy for the Elsa Cloud shell. Not part of the #53 action contract. */
export const CLOUD_PAGE_TITLE = "Elsa Cloud";
export const CLOUD_ENGINES_INTRO = "Your Elsa Cloud engines in this workspace.";
export const CLOUD_EMPTY_MESSAGE = "No engines yet";
export const CLOUD_OPEN_LINK = "Open Elsa Cloud";
export const CLOUD_WORKSPACE_LABEL = "Workspace:";
export const CLOUD_UPDATING_HEADING = "Elsa Cloud is being updated";
export const CLOUD_ERROR_HEADING = "Could not load Elsa Cloud";
export const CLOUD_ERROR_RETRY = "Try again";
export const CLOUD_SETUP_HEADING = "Set up Elsa Cloud";
export const CLOUD_SETUP_ACTION = "Set up Elsa Cloud";
export const CLOUD_SETUP_MESSAGE =
  "Create your Elsa Cloud organization to view managed engines, or reopen an existing one. Opening this page does not create one.";
export const CLOUD_LINK_ORG_HEADING = "Link this organization";
export const CLOUD_LINK_ORG_ACTION = "Link this organization";
export const CLOUD_LINK_ORG_MESSAGE =
  "Connect this Hub organization to Elsa Cloud so engines and checkout can use it.";
export const CLOUD_LINK_ORG_ASK_ADMIN =
  "Ask an organization admin to link Elsa Cloud for this organization.";
export const CLOUD_LINK_ORG_UPDATING =
  "Elsa Cloud isn't available for linking yet. Please try again later.";
export const CLOUD_LINK_ORG_ERROR = "Could not link this organization to Elsa Cloud.";
export const CLOUD_LINK_ORG_SUCCESS = "This organization is now linked to Elsa Cloud.";
export const CLOUD_BILLING_NEEDS_LINK = "Link this organization first";
export const CLOUD_BILLING_UNAVAILABLE = "Billing is temporarily unavailable";
export const CLOUD_LINK_CHECK_ERROR =
  "Could not check whether this organization is linked to Elsa Cloud.";
export const CLOUD_PICK_ORG_HEADING = "Choose an organization";
export const CLOUD_PICK_ORG_MESSAGE =
  "Pick which Hub organization to open in Elsa Cloud.";
export const CLOUD_CREATE_ENGINE = "Create engine";
export const CLOUD_ENGINE_NAME_LABEL = "Engine name";
export const CLOUD_OPEN_STUDIO = "Open Studio";
export const CLOUD_RESTART = "Restart";
export const CLOUD_RESTART_CONFIRM = "Restart this engine?";
export const CLOUD_APPLY_RELEASE = "Apply release";
export const CLOUD_DELETE_ENGINE = "Delete engine";
export const CLOUD_DELETE_CONFIRM = "Delete this engine?";
export const CLOUD_STRUCTURED_LOGS = "Structured logs";
export const CLOUD_PROVISIONING_HEADING = "Provisioning";
export { CLOUD_LIMIT_MESSAGE, CLOUD_ORG_LINK_CONFLICT } from "@/lib/cloud";

export function cloudEngineCountLabel(count: number): string {
  if (count <= 0) return CLOUD_EMPTY_MESSAGE;
  return count === 1 ? "1 engine" : `${count} engines`;
}
