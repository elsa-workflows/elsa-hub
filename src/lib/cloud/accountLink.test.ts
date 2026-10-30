import { describe, expect, it } from "vitest";
import {
  CLOUD_ACCOUNT_LINK_CONFLICT,
  CLOUD_ACCOUNT_LINK_HAS_ENGINES,
  CLOUD_ACCOUNT_LINK_REAUTH,
} from "./actions";
import { accountLinkResultView, reauthMessage } from "./accountLink";

describe("accountLinkResultView", () => {
  it("maps a first link and an already-linked pair", () => {
    expect(accountLinkResultView({
      ok: true,
      state: "linked",
      accountId: "77777777-7777-4777-8777-777777777777",
    })).toEqual({ kind: "linked" });
    expect(accountLinkResultView({
      ok: true,
      state: "already_linked",
      accountId: "77777777-7777-4777-8777-777777777777",
    })).toEqual({ kind: "already_linked" });
  });

  it("maps Control conflict codes to readable messages", () => {
    expect(accountLinkResultView({
      ok: false,
      code: "account_already_linked",
      error: CLOUD_ACCOUNT_LINK_CONFLICT,
    })).toEqual({ kind: "conflict", message: CLOUD_ACCOUNT_LINK_CONFLICT });
    expect(accountLinkResultView({
      ok: false,
      code: "hub_account_has_engines",
      error: CLOUD_ACCOUNT_LINK_HAS_ENGINES,
    })).toEqual({ kind: "conflict", message: CLOUD_ACCOUNT_LINK_HAS_ENGINES });
  });

  it("maps reauthentication-required including staleSession", () => {
    expect(accountLinkResultView({
      ok: false,
      code: "reauthentication_required",
      error: CLOUD_ACCOUNT_LINK_REAUTH,
      staleSession: "cloud",
    })).toEqual({ kind: "reauth", staleSession: "cloud" });
    expect(reauthMessage("hub")).toMatch(/hub/i);
    expect(reauthMessage("both")).toMatch(/hub and elsa cloud/i);
  });
});
