// Notification type definitions

export type NotificationType =
  | "org_invitation"
  | "provider_invitation"
  | "work_logged"
  | "purchase_completed"
  | "subscription_renewed"
  | "intro_call_submitted";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  payload: Record<string, unknown>;
  action_url: string | null;
  read_at: string | null;
  dismissed_at: string | null;
  created_at: string;
}

// Type-specific payloads
export interface OrgInvitationPayload {
  invitation_id: string;
  organization_id: string;
  organization_name: string;
  role: "owner" | "admin" | "member";
  expires_at: string;
  token: string;
}

export interface WorkLoggedPayload {
  work_log_id: string;
  provider_name: string;
  minutes: number;
  category: string;
  description: string;
}

export interface PurchaseCompletedPayload {
  order_id: string;
  organization_name: string;
  bundle_name: string;
  hours: number;
  amount_formatted: string;
}

export interface SubscriptionRenewedPayload {
  subscription_id: string;
  organization_name: string;
  monthly_hours: number;
}

export interface IntroCallSubmittedPayload {
  request_id: string;
  company_name: string;
  full_name: string;
  email: string;
  project_stage: string;
}

// Helper type guard functions
export function isOrgInvitationPayload(payload: unknown): payload is OrgInvitationPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "invitation_id" in payload &&
    "organization_name" in payload
  );
}
