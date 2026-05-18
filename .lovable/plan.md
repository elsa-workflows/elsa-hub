
# Runtime Builder — data ownership & migration plan

## 1. What comes from the Catalog API today

All upstream HTTP goes through the `runtime-builder-catalog` Supabase edge function (so the `X-Api-Key` stays server-side). The browser never calls the upstream `api-k35qdj734hds2.azurewebsites.net` directly.

Two upstream endpoints are proxied:

| Action | Upstream | Used by |
|---|---|---|
| `catalog` | `GET /api/builder/catalog` | `useCatalogQuery()` → wizard population |
| `resolve` | `POST /api/builder/resolve` | `useResolveQuery()` → Step "Validate" |
| `health` | `GET /health` | unused in UI |

The catalog payload, normalized in `src/lib/runtime-builder/catalog-client.ts`, gives us **`CatalogV2`** = `{ packages, infrastructureProviders }`:

- **Packages** (`PackageManifest`): id, displayName, description, versions[], `latestVersion`, licenseTier, stability, category, conflictsWith, tags
- **Features per package** (`PackageFeature`): id, displayName, description, `requires.infrastructure[]` (kind + capability constraints), `settings[]` (JSON-Schema-ish: name, jsonType, required, secret, defaultValue, enumValues, advanced, group, envHint, nested settings, free-form `ui` hints), `dependencies[]` (featureId + optional packageId)
- **Infrastructure providers** (`InfrastructureProvider`): id, displayName, kind, strategy (`compose-sidecar` | `external-service` | `managed` | `none`), provider, capabilities[], outputs[] (e.g. `connectionString`, `host`, `port`), optional settings[]

`resolve` returns `{ compatible, findings: [{level, code, message, scope}] }` based on the user's `{packages, infrastructure}` selection. Upstream 5xx is degraded to a `warning` finding so the wizard never blocks.

## 2. What we manage locally (in this repo)

### 2a. Static data — `src/data/dockerImages.ts`

The **entire Docker image catalog is local**, not from the API. For each image (`elsa-pro-server`, `elsa-pro-studio`, `elsa-pro-combined`):

- slug, marketing name/tagline/description, Lucide icon, tags, highlights
- `image` (Docker repo), `defaultPort` / `hostPort`, `containerName`, `needsSharedNetwork`, `requiresServer`
- `envVars[]` — the entries the wizard shows on Step 2 "Image config" (e.g. `Backend__Url`, the three `CShells__Shells__Default__Features__…` keys on the Combined image, etc.)
- `fullStackComposeFile` (long inline Compose snippet shown in the docs section)
- Doc-page fields: `dockerHubUrl`, `showPerShellAdmin`, `showNuplane`, `containerPaths`, etc.

`src/lib/runtime-builder/images.ts` re-projects this into `BuilderImage` (with `envDefaults`) for the wizard. The Catalog API has no knowledge of which Docker images exist or what their env vars are.

### 2b. Runtime state — Zustand store

`src/lib/runtime-builder/store.ts` persists `BuilderStateV2` to `localStorage` (key `elsa-runtime-builder/v1`): selected image+tag+port+env overrides, package sources, selected packages/features/settings, infra selections, local-packages folder, advanced mode, meta. Includes a v1→reset migration path.

### 2c. Pure client logic

- `requirements.ts` — derives `InfraRequirement[]` from selected features; `autoFillInfrastructure` and `pickDefaultProvider` (prefers `compose-sidecar` satisfying all capabilities).
- `dependencies.ts` — `applyClosure` for feature→feature and feature→package auto-add with `autoAdded` / `autoFeatures` flags.
- `validate.ts` — local readiness/finding computation (separate from upstream `resolve`).
- `catalog-utils.ts` / `feature-catalog.ts` / `migration-map.ts` — lookup helpers and legacy migration.

### 2d. Bundle generation — `src/lib/runtime-builder/generate.ts`

`generateBundleFilesV2(state, catalog)` produces six files **entirely in the browser**:

1. **`config.json`** — `buildAppSettings`: walks `selectedPackages → features → settings`, capitalizes setting names, drops in `Elsa.<pkgKey>.<FeatureName>` nodes, plus a hard-coded `Nuplane.Setup` block with `Feeds` derived from `packageSources` (`buildNuplaneFeeds`, including pinned `IncludePatterns` for non-nuget.org feeds) and `Nuplane.Loading.SharedAssemblies` (hard-coded `CShells.Abstractions`, `Elsa`, …).
2. **`Program.Generated.cs`** — illustrative `builder.Services.AddElsa(...)` with `elsa.Use<Feature>()` lines.
3. **`packages.lock.json`** — image ref + selected packages + sources + infra.
4. **`docker-compose.yml`** — `buildDockerCompose`: app service with env seeded from image `envDefaults` + overrides, infra-derived env from `composeFragment` (hard-coded YAML snippets for postgres/sqlserver/rabbitmq/redis/azurite/mailpit), studio→server companion logic, `depends_on` with `service_healthy`, volumes.
5. **`.env.example`** — `buildEnvExample`: external-service env vars + per-setting `envHint` lines.
6. **`README.md`** — `buildReadme`: human summary.

Everything that should be coming from `package.feature.settings` is fine; everything in the **hard-coded blocks** (`composeFragment`, `NUPLANE_SHARED_ASSEMBLIES`, image env-var seeding, studio companion behavior, file list/layout) is duplicated knowledge that the backend will need.

## 3. Current technical architecture

```text
        ┌─────────────────────────────────────────────────────────────┐
        │ Browser (React + Vite)                                      │
        │                                                             │
        │  RuntimeBuilderComposer (URL ?step=N)                       │
        │   ├─ Step 1  Image          ─┐                              │
        │   ├─ Step 2  Image config   ─┤── reads src/data/            │
        │   ├─ Step 3+ Capabilities/   │   dockerImages.ts            │
        │   │          Pkgs/Features  ─┤                              │
        │   ├─ Step    Infrastructure ─┤                              │
        │   ├─ Step    Configure       │                              │
        │   ├─ Step    Validate       ─┤── useResolveQuery            │
        │   └─ Step    Bundle         ─┘── generateBundleFilesV2()    │
        │                                                             │
        │  Zustand store ─── persist ──► localStorage                 │
        │  React Query  ─── useCatalogQuery / useResolveQuery         │
        │       │                                                     │
        └───────┼─────────────────────────────────────────────────────┘
                │ supabase.functions.invoke('runtime-builder-catalog',│
                │   { action: 'catalog' | 'resolve', body })          │
                ▼
        ┌─────────────────────────────────────────────────────────────┐
        │ Supabase Edge Function: runtime-builder-catalog             │
        │  - holds ELSA_PACKAGE_CATALOG_API_KEY                       │
        │  - 60s in-memory catalog cache                              │
        │  - degrades resolve 5xx to a warning finding                │
        └───────┬─────────────────────────────────────────────────────┘
                │ X-Api-Key
                ▼
        ┌─────────────────────────────────────────────────────────────┐
        │ Upstream Catalog API (Azure)                                │
        │  GET  /api/builder/catalog   POST /api/builder/resolve      │
        └─────────────────────────────────────────────────────────────┘
```

Bundle generation, image catalog, Compose templates, Nuplane wiring, and config-file shape all live **client-side** today. The Catalog API only knows about packages, features, infra providers, and resolve verdicts.

## 4. What to move to the backend, and why

Goals: single source of truth for the deployable shape; faster iteration without shipping a frontend; consistent output between the wizard, the Weaver agent, and any future CLI; smaller bundle generation surface in the browser.

### Phase 1 — Move bundle generation behind a new upstream endpoint

Add upstream `POST /api/builder/bundle` returning `{ files: [{ path, language, contents }] }`. The request mirrors what `generate.ts` consumes today:

```json
{
  "image":   { "slug": "elsa-pro-combined", "tag": "latest", "hostPort": 8080, "envOverrides": { ... } },
  "packages":[ { "id": "...", "version": "...", "features": ["..."], "settings": {...} } ],
  "packageSources":[ ... ],
  "infrastructure":[ { "kind":"database", "providerId":"postgres-compose", "strategy":"compose-sidecar", "settings":{} } ],
  "localPackages": { "enabled": false, "directoryPath": "packages" }
}
```

In this repo:
- Add `action: 'bundle'` to `supabase/functions/runtime-builder-catalog/index.ts`.
- Add `fetchBundle(req)` to `catalog-client.ts` and a `useBundleQuery` (debounced).
- Switch `StepBundle.tsx` to that hook; keep `generateBundleFilesV2` as a thin client fallback for offline preview only (or remove once the endpoint is stable).
- Delete `composeFragment`, `NUPLANE_SHARED_ASSEMBLIES`, `buildAppSettings`, `buildProgramCs`, `buildPackagesLock`, `buildEnvExample`, `buildReadme` from `generate.ts` once parity is verified.

### Phase 2 — Move the Docker image catalog upstream

Today `src/data/dockerImages.ts` is the only source for image metadata + env defaults — that is exactly the mismatch you ran into with the `CShells__…` entries. Two options:

- **2a (recommended for the builder)**: extend the catalog response with `images: RuntimeImage[]` (slug, image, defaultPort, hostPort, containerName, requiresServer, envDefaults, fullStackComposeFile, dockerHubUrl). The marketing/doc page can keep reading the same shape via a thin server fetch + local fallback.
- **2b**: split — keep marketing copy local (icon, tagline, highlights, container path docs), pull only deployment-affecting fields from the API. This is the cleaner separation if the docs site must stay statically rendered.

Once `envDefaults` come from upstream, `buildDockerCompose`'s seeding loop becomes a pass-through and the Studio→Server companion rule moves into the bundle endpoint.

### Phase 3 — Move local-only logic upstream too (optional, after Phase 1/2)

- `applyClosure` (dependency/feature auto-add) and `autoFillInfrastructure` could be exposed as `POST /api/builder/plan` so the client only stores user intent and renders the server's resolved state. This kills the divergence risk between client closure and server `resolve`.
- Local `validate.ts` becomes redundant once `resolve` covers readiness + findings.

### What stays in the browser

- Zustand store of **user intent** (selections, overrides, advanced toggle) + `localStorage` persistence.
- Step routing, form rendering (`SchemaField`, `InfrastructurePicker`), toasts, import/export of the intent JSON.
- React Query caching of catalog/resolve/bundle responses.

## 5. Sequencing & risk

1. **Phase 1 first** — biggest win, lowest blast radius. Build endpoint, hash-compare its output against `generateBundleFilesV2` over a corpus of saved states (`packages.lock.json` snapshots are convenient fixtures), flip the switch, then delete client code.
2. **Phase 2** — coordinate with the marketing/docs page that also reads `dockerImages.ts`. Ship a shim that prefers upstream and falls back to the local file so the docs page never breaks during rollout.
3. **Phase 3** — only after the wizard has been on Phase 1+2 for a release cycle, to avoid churning the API.

## Open questions before Phase 1

- Should the bundle endpoint return raw files or also a packaged `.zip`? Today the UI streams individual files into JSZip; a server-side `.zip` would simplify the client further.
- Are there bundle outputs you want **only on the server** (signed `packages.lock.json`, license-tier gating, per-customer Nuplane feed credentials)? That would tilt the decision strongly toward Phase 1.
- Who owns the Compose templates long-term — the Catalog API repo or a separate "deploy templates" service? That affects whether Phase 2a or 2b is cleaner.
