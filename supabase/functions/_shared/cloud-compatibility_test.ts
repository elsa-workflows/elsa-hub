import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  createCompatibilityCache,
  isCloudWriteAction,
  writeActionsAllowed,
} from "./cloud-compatibility.ts";

Deno.test("isCloudWriteAction lists only Hub mutation actions", () => {
  assertEquals(isCloudWriteAction("createEngine"), true);
  assertEquals(isCloudWriteAction("issueStudioHandoff"), true);
  assertEquals(isCloudWriteAction("linkCloudAccount"), true);
  assertEquals(isCloudWriteAction("listEngines"), false);
  assertEquals(isCloudWriteAction("compatibility"), false);
  assertEquals(isCloudWriteAction("bootstrap"), false);
});

Deno.test("writeActionsAllowed caches the compatibility read", async () => {
  let now = 0;
  const cache = createCompatibilityCache({ ttlMs: 60_000, now: () => now });
  let reads = 0;
  const fetch = async () => {
    reads += 1;
    return {
      ok: true as const,
      status: 200,
      body: {
        contractVersion: 1,
        capabilities: [
          "cloud.bootstrap.v1",
          "hosted.instances.list.v1",
          "hosted.instances.status.v1",
          "hosted.instances.provisioning-progress.v1",
          "hosted.instances.overview.v1",
          "hosted.instances.quota-problem.v1",
          "hosted.instances.create.v1",
          "hosted.studio.handoff.issue.v1",
          "hosted.instances.confirmed-delete.v1",
        ],
      },
    };
  };

  assertEquals(await writeActionsAllowed(fetch, "token", cache), true);
  assertEquals(await writeActionsAllowed(fetch, "token", cache), true);
  assertEquals(reads, 1);
  now = 60_000;
  assertEquals(await writeActionsAllowed(fetch, "token", cache), true);
  assertEquals(reads, 2);
});

Deno.test("writeActionsAllowed treats a failed compatibility read as blocked and does not cache it", async () => {
  const cache = createCompatibilityCache();
  let reads = 0;
  const fetch = async () => {
    reads += 1;
    if (reads === 1) return { ok: false as const, kind: "updating" as const };
    return {
      ok: true as const,
      status: 200,
      body: {
        contractVersion: 1,
        capabilities: [
          "cloud.bootstrap.v1",
          "hosted.instances.list.v1",
          "hosted.instances.status.v1",
          "hosted.instances.provisioning-progress.v1",
          "hosted.instances.overview.v1",
          "hosted.instances.quota-problem.v1",
          "hosted.instances.create.v1",
          "hosted.studio.handoff.issue.v1",
          "hosted.instances.confirmed-delete.v1",
        ],
      },
    };
  };

  assertEquals(await writeActionsAllowed(fetch, "token", cache), false);
  assertEquals(cache.get(), undefined);
  assertEquals(await writeActionsAllowed(fetch, "token", cache), true);
  assertEquals(reads, 2);
});
