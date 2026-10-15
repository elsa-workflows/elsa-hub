import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";

export const ACADEMY_CLAIM_PENDING_GRANTS_RPC = "academy_claim_pending_grants";
export const ACADEMY_CLAIM_PENDING_TEAM_GRANT_RPC = "academy_claim_pending_team_grant";

export type AcademyClaimPendingResult = {
  personal_claimed: number;
  team_pending: number;
  team_status: "none" | "ready" | "needs_organization";
};

export type AcademyClaimTeamResult = {
  status:
    | "granted"
    | "needs_organization"
    | "not_authorized"
    | "already_claimed"
    | "nothing_to_claim"
    | "unconfirmed";
  claimed: number;
  seats: number;
  redemption_count: number;
};

// Call once after a confirmed Hub session exists. The Academy routes PR (#38)
// should wire this. This file does not hook auth itself.
export async function claimAcademyPendingGrants(
  client: SupabaseClient<Database>,
): Promise<AcademyClaimPendingResult> {
  const { data, error } = await client.rpc(ACADEMY_CLAIM_PENDING_GRANTS_RPC);
  if (error) {
    throw error;
  }
  return parseClaimPending(data);
}

export async function claimAcademyPendingTeamGrant(
  client: SupabaseClient<Database>,
  organizationId: string,
): Promise<AcademyClaimTeamResult> {
  const { data, error } = await client.rpc(ACADEMY_CLAIM_PENDING_TEAM_GRANT_RPC, {
    p_organization_id: organizationId,
  });
  if (error) {
    throw error;
  }
  return parseClaimTeam(data);
}

function asRecord(value: Json | null): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function parseClaimPending(value: Json | null): AcademyClaimPendingResult {
  const record = asRecord(value);
  const teamStatus = record.team_status;
  return {
    personal_claimed: Number(record.personal_claimed ?? 0),
    team_pending: Number(record.team_pending ?? 0),
    team_status:
      teamStatus === "ready" || teamStatus === "needs_organization" || teamStatus === "none"
        ? teamStatus
        : "none",
  };
}

function parseClaimTeam(value: Json | null): AcademyClaimTeamResult {
  const record = asRecord(value);
  const status = record.status;
  return {
    status:
      status === "granted" ||
      status === "needs_organization" ||
      status === "not_authorized" ||
      status === "already_claimed" ||
      status === "nothing_to_claim" ||
      status === "unconfirmed"
        ? status
        : "nothing_to_claim",
    claimed: Number(record.claimed ?? 0),
    seats: Number(record.seats ?? 0),
    redemption_count: Number(record.redemption_count ?? 0),
  };
}
