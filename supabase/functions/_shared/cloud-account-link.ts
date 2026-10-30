import { jsonResponse } from "./cloud-http.ts";
import type { ControlResult } from "./cloud-control.ts";
import {
  CLOUD_ACCOUNT_LINK_CLOUD_MISSING,
  CLOUD_ACCOUNT_LINK_CLOUD_MISSING_CODE,
  CLOUD_ACCOUNT_LINK_CONFLICT,
  CLOUD_ACCOUNT_LINK_CONFLICT_CODE,
  CLOUD_ACCOUNT_LINK_HAS_ENGINES,
  CLOUD_ACCOUNT_LINK_HAS_ENGINES_CODE,
  CLOUD_ACCOUNT_LINK_HAS_STATE,
  CLOUD_ACCOUNT_LINK_HAS_STATE_CODE,
  CLOUD_ACCOUNT_LINK_REAUTH,
  CLOUD_ACCOUNT_LINK_REAUTH_CODE,
  CLOUD_ACCOUNT_LINK_SESSIONS,
  CLOUD_ACCOUNT_LINK_SESSIONS_CODE,
  isGuid,
  updatingBody,
} from "./cloud-types.ts";

const CONTROL_SESSIONS = "cloud.account-link.sessions-required";
const CONTROL_REAUTH = "cloud.account-link.reauthentication-required";
const CONTROL_CLOUD_MISSING = "cloud.account-link.cloud-account-missing";
const CONTROL_ALREADY_LINKED = "cloud.account-link.account-already-linked";
const CONTROL_HAS_ENGINES = "cloud.account-link.hub-account-has-engines";
const CONTROL_HAS_STATE = "cloud.account-link.hub-account-has-state";

export function accountLinkFailure(result: Extract<ControlResult, { ok: false }>): Response {
  if (result.kind === "unauthorized" && result.code === CONTROL_REAUTH) {
    return jsonResponse(401, {
      ok: false,
      code: CLOUD_ACCOUNT_LINK_REAUTH_CODE,
      error: CLOUD_ACCOUNT_LINK_REAUTH,
      staleSession: result.staleSession ?? "both",
    });
  }
  if (result.kind === "unauthorized" && result.code === CONTROL_SESSIONS) {
    return jsonResponse(401, {
      ok: false,
      code: CLOUD_ACCOUNT_LINK_SESSIONS_CODE,
      error: CLOUD_ACCOUNT_LINK_SESSIONS,
    });
  }
  if (result.kind === "invalid" || result.kind === "unauthorized") {
    if (result.code === CONTROL_CLOUD_MISSING) {
      return jsonResponse(409, {
        ok: false,
        code: CLOUD_ACCOUNT_LINK_CLOUD_MISSING_CODE,
        error: CLOUD_ACCOUNT_LINK_CLOUD_MISSING,
      });
    }
    if (result.code === CONTROL_ALREADY_LINKED) {
      return jsonResponse(409, {
        ok: false,
        code: CLOUD_ACCOUNT_LINK_CONFLICT_CODE,
        error: CLOUD_ACCOUNT_LINK_CONFLICT,
      });
    }
    if (result.code === CONTROL_HAS_ENGINES) {
      return jsonResponse(409, {
        ok: false,
        code: CLOUD_ACCOUNT_LINK_HAS_ENGINES_CODE,
        error: CLOUD_ACCOUNT_LINK_HAS_ENGINES,
      });
    }
    if (result.code === CONTROL_HAS_STATE) {
      return jsonResponse(409, {
        ok: false,
        code: CLOUD_ACCOUNT_LINK_HAS_STATE_CODE,
        error: CLOUD_ACCOUNT_LINK_HAS_STATE,
      });
    }
  }
  return jsonResponse(503, updatingBody());
}

export function normalizeAccountLink(body: unknown): {
  accountId: string;
  alreadyLinked: boolean;
} | null {
  if (body === null || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  const accountId = typeof record.accountId === "string"
    ? record.accountId
    : typeof record.AccountId === "string"
    ? record.AccountId
    : null;
  if (!isGuid(accountId)) return null;
  return {
    accountId,
    alreadyLinked: Boolean(record.alreadyLinked ?? record.AlreadyLinked),
  };
}
