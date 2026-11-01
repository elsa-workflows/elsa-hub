/** UI copy for the Elsa Cloud shell. Not part of the #53 action contract. */
export const CLOUD_PAGE_TITLE = "Elsa Cloud";
export const CLOUD_ENGINES_INTRO = "Your Elsa Cloud engines in this workspace.";
export const CLOUD_EMPTY_MESSAGE = "No engines yet";
export const CLOUD_OPEN_LINK = "Open Elsa Cloud";
export const CLOUD_WORKSPACE_LABEL = "Workspace:";
export const CLOUD_UPDATING_HEADING = "Elsa Cloud is being updated";
export const CLOUD_UPDATING_RETRY = "Check again";
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
export const CLOUD_LINK_ORG_NOT_CONNECTED =
  "Elsa Cloud isn't connected to this Hub organization yet.";
export const CLOUD_LINK_ORG_UPDATING =
  "Elsa Cloud isn't available for linking yet. Please try again later.";
export const CLOUD_LINK_ORG_ERROR = "Could not link this organization to Elsa Cloud.";
export const CLOUD_LINK_ORG_SUCCESS = "This organization is now linked to Elsa Cloud.";
export const CLOUD_BILLING_NEEDS_LINK = "Link this organization first";
export const CLOUD_BILLING_UNAVAILABLE = "Billing is temporarily unavailable";
export const CLOUD_BILLING_NOT_AVAILABLE_YET =
  "Elsa Cloud billing isn't available yet.";
export const CLOUD_BILLING_NO_CUSTOMER =
  "Hub has no billing customer for this organization, so the billing portal cannot be opened.";
export const CLOUD_PREVIEW_LIMITS_HEADING = "Preview limits";
export const CLOUD_PREVIEW_ONE_USER =
  "During Preview, each organization has one Elsa Cloud user.";
export const CLOUD_LINK_CHECK_ERROR =
  "Could not check whether this organization is linked to Elsa Cloud.";
export const CLOUD_PICK_ORG_HEADING = "Choose an organization";
export const CLOUD_PICK_ORG_MESSAGE =
  "Pick which Hub organization to open in Elsa Cloud.";
export const CLOUD_ACCOUNT_LINK_TITLE = "Bring your Elsa Cloud account";
export const CLOUD_ACCOUNT_LINK_INTRO =
  "Sign in to Elsa Cloud in this step, then confirm. Microsoft, Google, or email Cloud accounts all work here. The Hub keeps GitHub, Google, and email sign-in.";
/** Intro while Google sign-in to Elsa Cloud is switched off on the link page. */
export const CLOUD_ACCOUNT_LINK_INTRO_NO_GOOGLE =
  "Sign in to Elsa Cloud in this step, then confirm. Microsoft and email Cloud accounts work here. Use Microsoft or email to sign in to Elsa Cloud. The Hub keeps GitHub, Google, and email sign-in.";
export const CLOUD_ACCOUNT_LINK_ACTION = "Link Elsa Cloud account";
export const CLOUD_ACCOUNT_LINK_ALREADY_HEADING = "Already linked";
export const CLOUD_ACCOUNT_LINK_DONE_HEADING = "Accounts linked";
export const CLOUD_ACCOUNT_LINK_HELP =
  "Can't find your engines? Link an existing Elsa Cloud account.";
export const CLOUD_ACCOUNT_LINK_CLOUD_GOOGLE = "Sign in to Elsa Cloud with Google";
export const CLOUD_ACCOUNT_LINK_CLOUD_MICROSOFT = "Sign in to Elsa Cloud with Microsoft";
export const CLOUD_ACCOUNT_LINK_CLOUD_EMAIL = "Sign in to Elsa Cloud with email";
export const CLOUD_ACCOUNT_LINK_CLOUD_PASSWORD = "Password";
export const CLOUD_ACCOUNT_LINK_CLOUD_SIGN_IN = "Sign in";
export const CLOUD_ACCOUNT_LINK_CONFIRM = "Confirm and link";
export const CLOUD_ACCOUNT_LINK_UNAVAILABLE =
  "Elsa Cloud sign-in is not configured in this environment.";
export const CLOUD_ACCOUNT_LINK_SIGNIN_FAILED =
  "Elsa Cloud sign-in failed. Check your details and try again.";
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
