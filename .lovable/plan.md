
# Runtime Builder v2 — Package & Infrastructure Driven

Move the Runtime Builder from a static, image-defined capability picker to a deployment builder driven by **package manifests** and **first-class infrastructure selections**, sourced from the Elsa Package Catalog API.

Preview framing (banner, badges, `noindex`, disabled real downloads) stays. Existing `v1` localStorage state is migrated, not erased.

---

## 1. API contract (verified)

Base URL: `https://api-k35qdj734hds2.azurewebsites.net`
Auth: `X-Api-Key: <ELSA_PACKAGE_CATALOG_API_KEY>` (already saved as a runtime secret; **never** shipped to the browser).

Confirmed endpoints:

- `GET /api/builder/catalog` →
  ```json
  {
    "packages": [ /* manifest entries — currently empty, schema to be inferred */ ],
    "infrastructureProviders": [
      { "id": "postgres-compose", "displayName": "PostgreSQL",
        "kind": "database", "strategy": "compose-sidecar",
        "provider": "postgres",
        "capabilities": ["relational","transactions"],
        "outputs": ["connectionString"] },
      ...
    ]
  }
  ```
  Kinds present: `database`, `message-broker`, `cache`, `blob-storage`, `smtp`.
  Strategies present: `compose-sidecar`, `external-service` (we also model `managed` and `none` client-side for future use).

- `POST /api/builder/resolve`
  Body: `{ "packages": [...], "infrastructure": [...] }`
  → `{ "compatible": boolean, "findings": Array<{ level, code, message, scope? }> }`

- `GET /api/packages` → flat package list (`[]` today).
- `GET /health` → `{ "status": "ok" }`.

---

## 2. Backend — catalog proxy edge function

Add `supabase/functions/runtime-builder-catalog/index.ts`:

- Reads `ELSA_PACKAGE_CATALOG_API_BASE_URL` (default to the verified URL) and `ELSA_PACKAGE_CATALOG_API_KEY` from `Deno.env`.
- Routes:
  - `GET  ?action=catalog` → proxies `GET /api/builder/catalog`
  - `POST ?action=resolve` → proxies `POST /api/builder/resolve` with validated body (Zod).
- Standard CORS, JSON only, `verify_jwt = false` (catalog is public, but the API key stays server-side).
- 30s timeout, 5s in-memory cache for `catalog` keyed on the API base URL to avoid hammering Azure.
- Frontend calls it via `supabase.functions.invoke("runtime-builder-catalog", { body: { action, payload } })`.

No new tables, no migrations.

---

## 3. New domain types (`src/lib/runtime-builder/types-v2.ts`)

```ts
type Strategy = "compose-sidecar" | "external-service" | "managed" | "none";
type InfraKind = "database" | "message-broker" | "cache"
               | "blob-storage" | "smtp" | "search" | "secrets";

interface PackageSource {
  id: string;             // uuid
  name: string;           // "Elsa OSS", "Acme Internal"
  url: string;            // NuGet v3 index
  protocol: "nuget-v3";
  authMode: "none" | "apiKey";
  apiKeySecretName?: string;
  enabled: boolean;
}

interface PackageFeature {
  id: string;             // "elsa.persistence.ef-core.postgres"
  displayName: string;
  description?: string;
  requires?: { infrastructure?: { kind: InfraKind; capabilities?: string[] }[] };
  settings: SettingSchema[];   // reused from v1
}

interface PackageManifest {
  id: string;             // "Elsa.Persistence.EFCore.PostgreSql"
  displayName: string;
  description?: string;
  version: string;        // selected version (from manifest "versions[]")
  versions: string[];
  licenseTier: "OSS" | "Professional" | "Enterprise";
  stability: "Stable" | "Preview" | "Experimental";
  category: string;       // "Persistence", "Messaging", ...
  features: PackageFeature[];
  conflictsWith?: string[]; // package ids
  tags?: string[];
}

interface InfrastructureProvider {
  id: string;             // "postgres-compose"
  displayName: string;
  kind: InfraKind;
  strategy: Strategy;
  provider: string;       // "postgres"
  capabilities: string[];
  outputs: string[];      // "connectionString", "host", "port", ...
  settings?: SettingSchema[];
}

interface InfrastructureSelection {
  kind: InfraKind;            // logical requirement key
  providerId: string | null;  // chosen provider, or null when strategy === "none"
  strategy: Strategy;
  settings: Record<string, unknown>;
}

interface SelectedPackage {
  packageId: string;
  version: string;
  selectedFeatures: string[]; // feature ids
  settings: Record<string, Record<string, unknown>>; // featureId → setting map
}

interface BuilderStateV2 {
  schemaVersion: 2;
  packageSources: PackageSource[];
  selectedPackages: SelectedPackage[];
  infrastructureSelections: InfrastructureSelection[];
  shellProfile?: { id: string; settings?: Record<string, unknown> }; // reserved
  advancedMode: boolean;
  meta?: { name?: string; description?: string; createdAt?: string; updatedAt?: string };
}

interface CatalogV2 {
  packages: PackageManifest[];
  infrastructureProviders: InfrastructureProvider[];
}
```

Old `v1` types stay in `types.ts`; v2 lives in `types-v2.ts` so the migration code can reference both.

---

## 4. Catalog client + resolve hook

`src/lib/runtime-builder/catalog-client.ts`:
- `fetchCatalog(): Promise<CatalogV2>` — calls the edge function, normalizes provider records, dedupes by id.
- `resolveBuild(req): Promise<{ compatible, findings }>` — wraps `POST ?action=resolve`.
- `useCatalogQuery()` and `useResolveQuery(state)` React Query hooks (5 min stale, debounced resolve).

`src/lib/runtime-builder/requirements.ts`:
- `derivePackageCapabilities(selectedPackages, catalog)` → flat list of capability ids contributed by selected features (replaces image-driven `capabilities`).
- `deriveInfrastructureRequirements(selectedPackages, catalog)` → `{ kind, capabilities[], sources: feature[] }[]`.
- `autoFillInfrastructure(state, catalog)` → adds default `compose-sidecar` selection per missing required kind.

---

## 5. Local validation + migration

Rewrite `validate.ts` against v2:
- `errors`: missing required infra for a selected feature; missing required settings; `conflictsWith` violations.
- `warnings`: `external-service` strategy without a connection string set; preview-stability features.
- Then merges authoritative `findings` from the API resolve call (API findings always win on overlap).

`store.ts` (zustand, persisted):
- `STORAGE_KEY` stays `elsa-runtime-builder/v1`, but the persisted blob now carries `schemaVersion: 2`.
- `migrate()` reads any v1 blob, maps `imageId + capabilityIds + settings` → seeded `selectedPackages` (best-effort using a static `v1 → package` map kept in `migration-map.ts`) and seeds default infra selections. If no map entry, those caps are dropped and a one-time toast tells the user the build was reset to v2.
- New mutators: `addPackageSource`, `togglePackage`, `setPackageVersion`, `toggleFeature`, `setFeatureSetting`, `setInfrastructure(kind, providerId, strategy)`, `setInfrastructureSetting`, plus retained `setMeta`, `importState`, `reset`.

---

## 6. Wizard restructure (7 steps)

`src/pages/enterprise/RuntimeBuilderComposer.tsx` becomes:

```text
1. Sources       → manage NuGet feeds (add/edit/disable; default OSS feed seeded)
2. Packages      → browse + select packages from CatalogV2.packages
3. Features      → per selected package, pick features and required settings
4. Infrastructure→ for each derived requirement, pick provider + strategy
5. Configure     → cross-cutting settings (env, host, telemetry)
6. Validate      → local + API resolve findings, blocks on errors
7. Bundle        → preview generated files, copy-to-clipboard only
```

New components in `src/components/runtime-builder/`:
- `StepSources.tsx`
- `StepPackages.tsx` (replaces `StepImage`)
- `StepFeatures.tsx` (replaces `StepCapabilities`)
- `StepInfrastructure.tsx`
- `PackageCard.tsx`, `FeatureRow.tsx`, `InfrastructurePicker.tsx`, `StrategyBadge.tsx`

Keep, refactored to v2 shape: `StepConfigure`, `StepValidate`, `StepBundle`, `BuildSummary`, `Stepper`, `SchemaField`, `Import/ExportDialog`, `PreviewBanner`, `PreviewBadge`.

Delete after migration: `StepImage.tsx`, `StepCapabilities.tsx`, `ImagePickerCard.tsx`.

---

## 7. Provider-driven generator

Rewrite `src/lib/runtime-builder/generate.ts`:

- Output unchanged in shape (`GeneratedFile[]`), new contents:
  - `appsettings.Generated.json` — merges feature settings.
  - `Program.Generated.cs` — emits one `services.AddXxx(...)` per selected package/feature using a per-package emitter registry (`generators/<package-id>.ts`, falls back to a generic comment block).
  - `docker-compose.yml` — composed from `infrastructureSelections` where `strategy === "compose-sidecar"`. Each provider has a `composeFragment(settings)` helper in `generators/infra/<provider>.ts` (postgres, sqlserver, rabbitmq, redis, azurite, mailpit). `external-service` and `managed` strategies contribute only env vars; `none` contributes nothing.
  - `.env.example` — built from provider `outputs[]` and feature `envHint`s.
  - `README.md` — summarizes selected packages, infra strategies, and next steps.

Generation is **blocked** when local validation or API resolve returns errors.

---

## 8. Preview framing (unchanged)

- `PreviewBanner` and `PreviewBadge` stay mounted on landing/composer/entry points.
- `Seo noIndex` stays on the composer.
- Bundle step keeps "Download — coming soon" and copy-only actions.
- Mem entry `mem://features/elsa-plus/runtime-builder-preview` updated with the v2 architecture note (sources → packages → features → infrastructure → configure → validate → bundle, API-backed).

---

## 9. Out of scope

- No real archive/zip download, no auth on the catalog API call beyond the proxy key, no per-user package source persistence (sources live in local builder state for now), no shell profile UI (type reserved only), no NuGet credential storage, no changes to unrelated pages.

---

## Files

**New**
- `supabase/functions/runtime-builder-catalog/index.ts`
- `src/lib/runtime-builder/types-v2.ts`
- `src/lib/runtime-builder/catalog-client.ts`
- `src/lib/runtime-builder/requirements.ts`
- `src/lib/runtime-builder/migration-map.ts`
- `src/lib/runtime-builder/generators/index.ts` + per-package + per-infra emitters
- `src/components/runtime-builder/StepSources.tsx`
- `src/components/runtime-builder/StepPackages.tsx`
- `src/components/runtime-builder/StepFeatures.tsx`
- `src/components/runtime-builder/StepInfrastructure.tsx`
- `src/components/runtime-builder/PackageCard.tsx`
- `src/components/runtime-builder/FeatureRow.tsx`
- `src/components/runtime-builder/InfrastructurePicker.tsx`
- `src/components/runtime-builder/StrategyBadge.tsx`

**Edited**
- `src/lib/runtime-builder/store.ts` (v2 + migration)
- `src/lib/runtime-builder/validate.ts` (v2 + merge API findings)
- `src/lib/runtime-builder/generate.ts` (provider-driven)
- `src/lib/runtime-builder/types.ts` (kept, marked legacy)
- `src/pages/enterprise/RuntimeBuilderComposer.tsx` (7-step flow)
- `src/components/runtime-builder/{Stepper,BuildSummary,StepConfigure,StepValidate,StepBundle,ImportDialog,ExportDialog}.tsx`
- `mem://features/elsa-plus/runtime-builder-preview`

**Removed** (after migration lands)
- `src/components/runtime-builder/StepImage.tsx`
- `src/components/runtime-builder/StepCapabilities.tsx`
- `src/components/runtime-builder/ImagePickerCard.tsx`
