import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  CLOUD_ORGANIZATION_LINKS_TABLE,
  controlOrganizationIdFromLink,
  persistLinkFromValidatedBootstrap,
  readValidatedControlOrganizationId,
  readValidatedControlOrganizationLink,
  type ControlOrganizationLinkRow,
  type OrgAdminClient,
  type ValidatedControlBootstrap,
} from "./cloud-organization-link.ts";

const HUB_ORG = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_HUB_ORG = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CONTROL_ORG = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const OTHER_CONTROL_ORG = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const WORKSPACE_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const VALIDATED_AT = "2026-10-16T00:00:00.000Z";

const BOOTSTRAP: ValidatedControlBootstrap = {
  organizationId: CONTROL_ORG,
  workspaceId: WORKSPACE_ID,
};

const LINK_ROW: ControlOrganizationLinkRow = {
  hub_organization_id: HUB_ORG,
  control_organization_id: CONTROL_ORG,
  validated_at: VALIDATED_AT,
};

function adminClient(isAdmin: boolean, onRpc?: (fn: string) => void): OrgAdminClient {
  return {
    rpc(fn, args) {
      onRpc?.(fn);
      assertEquals(fn, "is_org_admin");
      assertEquals(args.p_org_id, HUB_ORG);
      return Promise.resolve({ data: isAdmin, error: null });
    },
  };
}

type StoredRow = ControlOrganizationLinkRow & { hub_organization_id: string };

function createLinkStore(options?: {
  rows?: StoredRow[];
  onInsert?: (row: StoredRow) => void;
  concurrentInserts?: boolean;
}) {
  const rows = [...(options?.rows ?? [])];
  const pendingInserts: Array<{
    row: StoredRow;
    resolve: (value: {
      data: ControlOrganizationLinkRow | null;
      error: { message: string; code?: string } | null;
    }) => void;
  }> = [];

  function findByHub(hubOrganizationId: string): StoredRow | undefined {
    return rows.find((row) => row.hub_organization_id === hubOrganizationId);
  }

  function commitInsert(row: StoredRow): {
    data: ControlOrganizationLinkRow | null;
    error: { message: string; code?: string } | null;
  } {
    if (
      findByHub(row.hub_organization_id) ||
      rows.some((existing) => existing.control_organization_id === row.control_organization_id)
    ) {
      return { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };
    }
    rows.push(row);
    options?.onInsert?.(row);
    return { data: row, error: null };
  }

  return {
    rows,
    from(table: string) {
      assertEquals(table, CLOUD_ORGANIZATION_LINKS_TABLE);
      return {
        select() {
          return {
            eq(column: string, value: string) {
              assertEquals(column, "hub_organization_id");
              return {
                maybeSingle() {
                  return Promise.resolve({ data: findByHub(value) ?? null, error: null });
                },
              };
            },
          };
        },
        insert(row: StoredRow) {
          return {
            select() {
              return {
                maybeSingle() {
                  if (!options?.concurrentInserts) {
                    return Promise.resolve(commitInsert(row));
                  }
                  return new Promise((resolve) => {
                    pendingInserts.push({ row, resolve });
                    if (pendingInserts.length >= 2) {
                      const [first, second] = pendingInserts.splice(0, 2);
                      first.resolve(commitInsert(first.row));
                      second.resolve(commitInsert(second.row));
                    }
                  });
                },
              };
            },
          };
        },
      };
    },
  };
}

Deno.test("unlinked org has no Control organization id", async () => {
  const store = createLinkStore();
  assertEquals(await readValidatedControlOrganizationId(store, HUB_ORG), null);
  assertEquals(await readValidatedControlOrganizationLink(store, HUB_ORG), null);
  assertEquals(controlOrganizationIdFromLink(null), null);
});

Deno.test("linked org returns the Control organization id from the row", async () => {
  const store = createLinkStore({ rows: [LINK_ROW as StoredRow] });
  assertEquals(await readValidatedControlOrganizationId(store, HUB_ORG), CONTROL_ORG);
  assertEquals(await readValidatedControlOrganizationLink(store, HUB_ORG), {
    hubOrganizationId: HUB_ORG,
    controlOrganizationId: CONTROL_ORG,
    validatedAt: VALIDATED_AT,
  });
  assertEquals(controlOrganizationIdFromLink(LINK_ROW), CONTROL_ORG);
  assertEquals(await readValidatedControlOrganizationId(store, OTHER_HUB_ORG), null);
});

Deno.test("a row without validated_at is not linked", async () => {
  const store = createLinkStore({
    rows: [{
      hub_organization_id: HUB_ORG,
      control_organization_id: CONTROL_ORG,
      validated_at: null,
    }],
  });
  assertEquals(await readValidatedControlOrganizationId(store, HUB_ORG), null);
  assertEquals(controlOrganizationIdFromLink({
    hub_organization_id: HUB_ORG,
    control_organization_id: CONTROL_ORG,
    validated_at: "",
  }), null);
});

Deno.test("a non-admin cannot create the link", async () => {
  let inserts = 0;
  const store = createLinkStore({
    onInsert() {
      inserts += 1;
    },
  });

  const result = await persistLinkFromValidatedBootstrap({
    userClient: adminClient(false),
    serviceClient: store,
    hubOrganizationId: HUB_ORG,
    bootstrap: BOOTSTRAP,
    now: () => VALIDATED_AT,
  });

  assertEquals(result, { ok: false, code: "forbidden" });
  assertEquals(inserts, 0);
  assertEquals(store.rows.length, 0);
});

Deno.test("an admin persists the Control org from the validated bootstrap result", async () => {
  const store = createLinkStore();
  const result = await persistLinkFromValidatedBootstrap({
    userClient: adminClient(true),
    serviceClient: store,
    hubOrganizationId: HUB_ORG,
    bootstrap: BOOTSTRAP,
    now: () => VALIDATED_AT,
  });

  assertEquals(result, {
    ok: true,
    link: {
      hubOrganizationId: HUB_ORG,
      controlOrganizationId: CONTROL_ORG,
      validatedAt: VALIDATED_AT,
    },
  });
  assertEquals(store.rows, [LINK_ROW]);
  assertEquals(await readValidatedControlOrganizationId(store, HUB_ORG), CONTROL_ORG);
});

Deno.test("a duplicate link for the same Control org is idempotent", async () => {
  let inserts = 0;
  const store = createLinkStore({
    rows: [LINK_ROW as StoredRow],
    onInsert() {
      inserts += 1;
    },
  });

  const result = await persistLinkFromValidatedBootstrap({
    userClient: adminClient(true),
    serviceClient: store,
    hubOrganizationId: HUB_ORG,
    bootstrap: BOOTSTRAP,
    now: () => "2026-10-16T12:00:00.000Z",
  });

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.link.controlOrganizationId, CONTROL_ORG);
    assertEquals(result.link.validatedAt, VALIDATED_AT);
  }
  assertEquals(inserts, 0);
  assertEquals(store.rows.length, 1);
});

Deno.test("a second Control org for the same Hub org is a conflict", async () => {
  const store = createLinkStore({ rows: [LINK_ROW as StoredRow] });
  const result = await persistLinkFromValidatedBootstrap({
    userClient: adminClient(true),
    serviceClient: store,
    hubOrganizationId: HUB_ORG,
    bootstrap: { organizationId: OTHER_CONTROL_ORG, workspaceId: WORKSPACE_ID },
    now: () => VALIDATED_AT,
  });
  assertEquals(result, { ok: false, code: "conflict" });
  assertEquals(store.rows.length, 1);
  assertEquals(store.rows[0].control_organization_id, CONTROL_ORG);
});

Deno.test("concurrent inserts of the same pair keep one row and succeed", async () => {
  const store = createLinkStore({ concurrentInserts: true });

  const [first, second] = await Promise.all([
    persistLinkFromValidatedBootstrap({
      userClient: adminClient(true),
      serviceClient: store,
      hubOrganizationId: HUB_ORG,
      bootstrap: BOOTSTRAP,
      now: () => VALIDATED_AT,
    }),
    persistLinkFromValidatedBootstrap({
      userClient: adminClient(true),
      serviceClient: store,
      hubOrganizationId: HUB_ORG,
      bootstrap: BOOTSTRAP,
      now: () => VALIDATED_AT,
    }),
  ]);

  assertEquals(first.ok, true);
  assertEquals(second.ok, true);
  if (first.ok && second.ok) {
    assertEquals(first.link.controlOrganizationId, CONTROL_ORG);
    assertEquals(second.link.controlOrganizationId, CONTROL_ORG);
  }
  assertEquals(store.rows.length, 1);
});

Deno.test("persist refuses a client-shaped Control id that is not a validated bootstrap", async () => {
  let inserts = 0;
  const store = createLinkStore({
    onInsert() {
      inserts += 1;
    },
  });

  const result = await persistLinkFromValidatedBootstrap({
    userClient: adminClient(true),
    serviceClient: store,
    hubOrganizationId: HUB_ORG,
    bootstrap: {
      organizationId: "not-a-guid",
      workspaceId: WORKSPACE_ID,
    },
    now: () => VALIDATED_AT,
  });

  assertEquals(result, { ok: false, code: "invalid_request" });
  assertEquals(inserts, 0);
});

Deno.test("the helper has no email parameter or lookup", async () => {
  const source = await Deno.readTextFile(new URL("./cloud-organization-link.ts", import.meta.url));
  assertEquals(/email/i.test(source), false);
  assertEquals(source.includes("persistLinkFromValidatedBootstrap"), true);
  assertEquals(source.includes("readValidatedControlOrganizationId"), true);
  assertEquals(source.includes("controlOrganizationId"), true);
  assertEquals(source.includes("client"), true);
});
