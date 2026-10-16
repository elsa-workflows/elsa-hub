/** UI copy for the Elsa Cloud shell. Not part of the #53 action contract. */
export const CLOUD_PAGE_TITLE = "Elsa Cloud";
export const CLOUD_ENGINES_INTRO = "Your Elsa Cloud engines in this workspace.";
export const CLOUD_EMPTY_MESSAGE = "No engines yet";
export const CLOUD_OPEN_LINK = "Open Elsa Cloud";
export const CLOUD_MANAGE_LINK = "Manage on elsacloud.app";
export const CLOUD_WORKSPACE_LABEL = "Workspace:";
export const CLOUD_UPDATING_HEADING = "Elsa Cloud is being updated";
export const CLOUD_ERROR_HEADING = "Could not load Elsa Cloud";
export const CLOUD_ERROR_RETRY = "Try again";
export const CLOUD_SETUP_HEADING = "Set up Elsa Cloud";
export const CLOUD_SETUP_ACTION = "Set up Elsa Cloud";
export const CLOUD_SETUP_MESSAGE =
  "Create your Elsa Cloud organization to view managed engines, or reopen an existing one. Opening this page does not create one.";

export function cloudEngineCountLabel(count: number): string {
  if (count <= 0) return CLOUD_EMPTY_MESSAGE;
  return count === 1 ? "1 engine" : `${count} engines`;
}
