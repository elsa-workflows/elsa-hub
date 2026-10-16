/**
 * Server-side Hub org → Control organization link.
 *
 * Write only from the validated Control bootstrap result in cloud-bff.
 * Never take the Control organization id from client input. Never match
 * or link Hub and Control subjects by profile identity.
 *
 * #55 should call `readValidatedControlOrganizationId` (or
 * `readValidatedControlOrganizationLink`) after the org-admin check and
 * write that Control id to `elsa_control_organization_id`.
 * #77 / cloud-bff should call `persistLinkFromValidatedBootstrap` with
 * `normalizeBootstrap(result)` after an org-admin bootstrap, never with a
 * client `controlOrganizationId`.
 */

import { isGuid } from "./cloud-types.ts";

export const CLOUD_ORGANIZATION_LINKS_TABLE = "cloud_organization_links" as const;

const LINK_COLUMNS = "hub_organization_id, control_organization_id, validated_at";

export type HubControlOrganizationLink = {
  hubOrganizationId: string;
  controlOrganizationId: string;
  validatedAt: string;
};

/** Output of `normalizeBootstrap`. The Control org id lives here only. */
export type ValidatedControlBootstrap = {
  organizationId: string;
  workspaceId: string;
};

export type PersistControlOrganizationLinkResult =
  | { ok: true; link: HubControlOrganizationLink }
  | {
    ok: false;
    code: "forbidden" | "conflict" | "invalid_request" | "unavailable";
  };

export type OrgAdminClient = {
  rpc: (
    fn: "is_org_admin",
    args: { p_org_id: string },
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export type ControlOrganizationLinkRow = {
  hub_organization_id?: string | null;
  control_organization_id?: string | null;
  validated_at?: string | null;
};

type QueryError = { message: string; code?: string } | null;

export type ControlOrganizationLinkStore = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => PromiseLike<{
          data: ControlOrganizationLinkRow | null;
          error: QueryError;
        }>;
      };
    };
    insert: (row: {
      hub_organization_id: string;
      control_organization_id: string;
      validated_at: string;
    }) => {
      select: (columns: string) => {
        maybeSingle: () => PromiseLike<{
          data: ControlOrganizationLinkRow | null;
          error: QueryError;
        }>;
      };
    };
  };
};

export function isValidatedControlOrganizationLink(
  link: HubControlOrganizationLink | null | undefined,
): link is HubControlOrganizationLink {
  return Boolean(
    link?.hubOrganizationId &&
      isGuid(link.hubOrganizationId) &&
      isGuid(link.controlOrganizationId) &&
      link.validatedAt.trim(),
  );
}

export function controlOrganizationIdFromLink(
  row: ControlOrganizationLinkRow | HubControlOrganizationLink | null | undefined,
): string | null {
  if (!row) return null;
  if ("controlOrganizationId" in row) {
    return isValidatedControlOrganizationLink(row) ? row.controlOrganizationId : null;
  }
  const link = linkFromRow(row);
  return isValidatedControlOrganizationLink(link) ? link.controlOrganizationId : null;
}

export function linkFromRow(
  row: ControlOrganizationLinkRow | null | undefined,
): HubControlOrganizationLink | null {
  if (!row) return null;
  const hubOrganizationId = row.hub_organization_id?.trim() ?? "";
  const controlOrganizationId = row.control_organization_id?.trim() ?? "";
  const validatedAt = row.validated_at?.trim() ?? "";
  const link = { hubOrganizationId, controlOrganizationId, validatedAt };
  return isValidatedControlOrganizationLink(link) ? link : null;
}

export async function readValidatedControlOrganizationLink(
  supabase: unknown,
  hubOrganizationId: string,
): Promise<HubControlOrganizationLink | null> {
  if (!isGuid(hubOrganizationId)) return null;

  const store = supabase as ControlOrganizationLinkStore;
  const { data, error } = await store
    .from(CLOUD_ORGANIZATION_LINKS_TABLE)
    .select(LINK_COLUMNS)
    .eq("hub_organization_id", hubOrganizationId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read Control organization link: ${error.message}`);
  }

  return linkFromRow(data);
}

/**
 * Control organization id for checkout metadata (`elsa_control_organization_id`).
 * Null when the Hub org has no validated link row.
 */
export async function readValidatedControlOrganizationId(
  supabase: unknown,
  hubOrganizationId: string,
): Promise<string | null> {
  const link = await readValidatedControlOrganizationLink(supabase, hubOrganizationId);
  return link?.controlOrganizationId ?? null;
}

function isUniqueViolation(error: QueryError): boolean {
  if (!error) return false;
  if (error.code === "23505") return true;
  return /duplicate key|unique constraint/i.test(error.message);
}

async function requireOrgAdmin(
  userClient: OrgAdminClient,
  hubOrganizationId: string,
): Promise<PersistControlOrganizationLinkResult | null> {
  const { data, error } = await userClient.rpc("is_org_admin", {
    p_org_id: hubOrganizationId,
  });
  if (error) return { ok: false, code: "unavailable" };
  if (data !== true) return { ok: false, code: "forbidden" };
  return null;
}

function sameLink(
  existing: HubControlOrganizationLink,
  controlOrganizationId: string,
): PersistControlOrganizationLinkResult {
  if (existing.controlOrganizationId === controlOrganizationId) {
    return { ok: true, link: existing };
  }
  return { ok: false, code: "conflict" };
}

/**
 * Persist the Control organization id from a validated bootstrap result.
 * Callers must pass `normalizeBootstrap(...)` — never a client field.
 */
export async function persistLinkFromValidatedBootstrap(input: {
  userClient: OrgAdminClient;
  serviceClient: unknown;
  hubOrganizationId: string;
  bootstrap: ValidatedControlBootstrap;
  now?: () => string;
}): Promise<PersistControlOrganizationLinkResult> {
  const serviceClient = input.serviceClient as ControlOrganizationLinkStore;
  const hubOrganizationId = input.hubOrganizationId.trim();
  const controlOrganizationId = input.bootstrap.organizationId.trim();
  const workspaceId = input.bootstrap.workspaceId.trim();

  if (!isGuid(hubOrganizationId) || !isGuid(controlOrganizationId) || !isGuid(workspaceId)) {
    return { ok: false, code: "invalid_request" };
  }

  const denied = await requireOrgAdmin(input.userClient, hubOrganizationId);
  if (denied) return denied;

  let existing: HubControlOrganizationLink | null;
  try {
    existing = await readValidatedControlOrganizationLink(
      serviceClient,
      hubOrganizationId,
    );
  } catch {
    return { ok: false, code: "unavailable" };
  }

  if (existing) return sameLink(existing, controlOrganizationId);

  const validatedAt = (input.now ?? (() => new Date().toISOString()))();
  const { data, error } = await serviceClient
    .from(CLOUD_ORGANIZATION_LINKS_TABLE)
    .insert({
      hub_organization_id: hubOrganizationId,
      control_organization_id: controlOrganizationId,
      validated_at: validatedAt,
    })
    .select(LINK_COLUMNS)
    .maybeSingle();

  if (!error) {
    const inserted = linkFromRow(data);
    if (!inserted) return { ok: false, code: "unavailable" };
    return { ok: true, link: inserted };
  }

  if (!isUniqueViolation(error)) return { ok: false, code: "unavailable" };

  let raced: HubControlOrganizationLink | null;
  try {
    raced = await readValidatedControlOrganizationLink(
      serviceClient,
      hubOrganizationId,
    );
  } catch {
    return { ok: false, code: "unavailable" };
  }

  if (!raced) return { ok: false, code: "conflict" };
  return sameLink(raced, controlOrganizationId);
}
