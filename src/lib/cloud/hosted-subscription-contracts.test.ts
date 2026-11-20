import { describe, expect, it } from "vitest";
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const VENDORED_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../supabase/functions/_shared/contracts/hosted-subscription",
);

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

const RESYNC_COMMAND = [
  "SHA=$(git ls-remote https://github.com/valence-works/elsa-control.git refs/heads/main | cut -f1)",
  "DEST=supabase/functions/_shared/contracts/hosted-subscription",
  "for f in README.md active.json billing-status-active.json billing-status-no-linkage.json no-billing-linkage.json retained.json suspended-canceled.json suspended-deletion-requested.json suspended-non-payment.json; do",
  '  curl -fsS -o "$DEST/$f" "https://raw.githubusercontent.com/valence-works/elsa-control/$SHA/contracts/hosted-subscription/$f"',
  "done",
  "# then set the commit SHA in supabase/functions/_shared/contracts/hosted-subscription/SOURCE.md",
].join("\n");

function missingOrDriftMessage(file: string, reason: string): string {
  return `Vendored Control hosted-subscription contract ${file} ${reason}. Resync with:\n${RESYNC_COMMAND}`;
}

const EXPECTED_HOSTED_SUBSCRIPTION: Record<string, {
  subscriptionState: string | null;
  suspensionReason: string | null;
  recoveryAction: string;
  source: string | null;
}> = {
  "active.json": {
    subscriptionState: "Active",
    suspensionReason: null,
    recoveryAction: "None",
    source: "hub",
  },
  "retained.json": {
    subscriptionState: "Retained",
    suspensionReason: null,
    recoveryAction: "None",
    source: "hub",
  },
  "no-billing-linkage.json": {
    subscriptionState: null,
    suspensionReason: null,
    recoveryAction: "None",
    source: null,
  },
  "suspended-canceled.json": {
    subscriptionState: "Suspended",
    suspensionReason: "Canceled",
    recoveryAction: "Subscribe",
    source: "hub",
  },
  "suspended-deletion-requested.json": {
    subscriptionState: "Suspended",
    suspensionReason: "DeletionRequested",
    recoveryAction: "None",
    source: "hub",
  },
  "suspended-non-payment.json": {
    subscriptionState: "Suspended",
    suspensionReason: "NonPayment",
    recoveryAction: "UpdatePaymentMethod",
    source: "hub",
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
    }

    for (const [file, state] of Object.entries(EXPECTED_BILLING_STATUS)) {
      const body = JSON.parse(fs.readFileSync(path.join(VENDORED_DIR, file), "utf8"));
      expect(body.subscription?.state ?? null, missingOrDriftMessage(file, "changed subscription.state")).toBe(
        state,
      );
    }
  });

  it("matches the same files on valence-works/elsa-control main byte-for-byte", async ({ skip }) => {
    let compared = 0;
    for (const file of UPSTREAM_FILES) {
      const result = await fetchUpstream(`${UPSTREAM_BASE}/${file}`, 8000);
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
