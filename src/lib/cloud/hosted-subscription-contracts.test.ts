import { describe, expect, it } from "vitest";
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const VENDORED_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../supabase/functions/_shared/contracts/hosted-subscription",
);

const SOURCE_MD = "supabase/functions/_shared/contracts/hosted-subscription/SOURCE.md";

const UPSTREAM_FILES = [
  "README.md",
  "active.json",
  "billing-status-active.json",
  "billing-status-no-linkage.json",
  "no-billing-linkage.json",
  "retained.json",
  "suspended-canceled.json",
  "suspended-deletion-requested.json",
  "suspended-non-payment.json",
] as const;

const UPSTREAM_BASE =
  "https://raw.githubusercontent.com/valence-works/elsa-control/main/contracts/hosted-subscription";

// Fetches run in parallel, so the budget is just above one request timeout.
const PER_FETCH_MS = 8_000;
const FETCH_BUDGET_MS = 10_000;
const TEST_TIMEOUT_MS = 15_000;

function missingOrDriftMessage(file: string, reason: string): string {
  return `Vendored Control hosted-subscription contract ${file} ${reason}. Resync with the command in ${SOURCE_MD}`;
}

const EXPECTED_HOSTED_SUBSCRIPTION: Record<string, {
  subscriptionState: string | null;
  suspensionReason: string | null;
  recoveryAction: string;
  source: string | null;
  maxInstances: number | null;
  activeDedicatedCount: number;
}> = {
  "active.json": {
    subscriptionState: "Active",
    suspensionReason: null,
    recoveryAction: "None",
    source: "hub",
    maxInstances: 1,
    activeDedicatedCount: 0,
  },
  "retained.json": {
    subscriptionState: "Retained",
    suspensionReason: null,
    recoveryAction: "None",
    source: "hub",
    maxInstances: 1,
    activeDedicatedCount: 0,
  },
  "no-billing-linkage.json": {
    subscriptionState: null,
    suspensionReason: null,
    recoveryAction: "None",
    source: null,
    maxInstances: null,
    activeDedicatedCount: 0,
  },
  "suspended-canceled.json": {
    subscriptionState: "Suspended",
    suspensionReason: "Canceled",
    recoveryAction: "Subscribe",
    source: "hub",
    maxInstances: 1,
    activeDedicatedCount: 0,
  },
  "suspended-deletion-requested.json": {
    subscriptionState: "Suspended",
    suspensionReason: "DeletionRequested",
    recoveryAction: "None",
    source: "hub",
    maxInstances: 1,
    activeDedicatedCount: 0,
  },
  "suspended-non-payment.json": {
    subscriptionState: "Suspended",
    suspensionReason: "NonPayment",
    recoveryAction: "UpdatePaymentMethod",
    source: "hub",
    maxInstances: 1,
    activeDedicatedCount: 0,
  },
};

const EXPECTED_BILLING_STATUS: Record<string, string | null> = {
  "billing-status-active.json": "Active",
  "billing-status-no-linkage.json": null,
};

function fetchUpstream(url: string, timeoutMs: number): Promise<{ ok: true; status: number; body: Buffer } | { ok: false }> {
  return new Promise((resolve) => {
    const request = https.get(url, {
      timeout: timeoutMs,
      headers: { "User-Agent": "elsa-hub-hosted-subscription-contract-check" },
    }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk) => {
        chunks.push(chunk);
      });
      response.on("end", () => {
        resolve({ ok: true, status: response.statusCode ?? 0, body: Buffer.concat(chunks) });
      });
    });
    request.on("error", () => resolve({ ok: false }));
    request.on("timeout", () => {
      request.destroy();
      resolve({ ok: false });
    });
  });
}

describe("Control hosted-subscription goldens", () => {
  it("vendors every upstream golden and keeps the expected state mapping", () => {
    for (const file of UPSTREAM_FILES) {
      const fullPath = path.join(VENDORED_DIR, file);
      expect(fs.existsSync(fullPath), missingOrDriftMessage(file, "is missing")).toBe(true);
    }

    for (const [file, expected] of Object.entries(EXPECTED_HOSTED_SUBSCRIPTION)) {
      const body = JSON.parse(fs.readFileSync(path.join(VENDORED_DIR, file), "utf8"));
      expect(body.subscriptionState, missingOrDriftMessage(file, "changed subscriptionState")).toBe(
        expected.subscriptionState,
      );
      expect(body.suspensionReason, missingOrDriftMessage(file, "changed suspensionReason")).toBe(
        expected.suspensionReason,
      );
      expect(body.recoveryAction, missingOrDriftMessage(file, "changed recoveryAction")).toBe(
        expected.recoveryAction,
      );
      expect(body.source, missingOrDriftMessage(file, "changed source")).toBe(expected.source);
      expect(body.maxInstances, missingOrDriftMessage(file, "changed maxInstances")).toBe(
        expected.maxInstances,
      );
      expect(body.activeDedicatedCount, missingOrDriftMessage(file, "changed activeDedicatedCount")).toBe(
        expected.activeDedicatedCount,
      );
    }

    for (const [file, state] of Object.entries(EXPECTED_BILLING_STATUS)) {
      const body = JSON.parse(fs.readFileSync(path.join(VENDORED_DIR, file), "utf8"));
      expect(body.subscription?.state ?? null, missingOrDriftMessage(file, "changed subscription.state")).toBe(
        state,
      );
    }
  });

  it("matches the same files on valence-works/elsa-control main byte-for-byte when HUB_CONTRACT_DRIFT=1", {
    timeout: TEST_TIMEOUT_MS,
  }, async ({ skip }) => {
    if (process.env.HUB_CONTRACT_DRIFT !== "1") {
      skip();
      return;
    }

    let settled = false;
    const budget = new Promise<"timeout">((resolve) => {
      setTimeout(() => {
        if (!settled) resolve("timeout");
      }, FETCH_BUDGET_MS);
    });

    const fetches = Promise.all(
      UPSTREAM_FILES.map(async (file) => ({
        file,
        result: await fetchUpstream(`${UPSTREAM_BASE}/${file}`, PER_FETCH_MS),
      })),
    );

    const raced = await Promise.race([
      fetches.then((rows) => ({ kind: "done" as const, rows })),
      budget.then(() => ({ kind: "timeout" as const })),
    ]);
    settled = true;

    if (raced.kind === "timeout") {
      skip();
      return;
    }

    let compared = 0;
    for (const { file, result } of raced.rows) {
      if (!result.ok || result.status !== 200) continue;
      const local = fs.readFileSync(path.join(VENDORED_DIR, file));
      expect(
        local.equals(result.body),
        missingOrDriftMessage(file, "differs from elsa-control main"),
      ).toBe(true);
      compared += 1;
    }
    if (compared === 0) skip();
  });
});
