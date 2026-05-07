## Split Production Docker Images into a catalog + per-image detail pages

Refactor `/elsa-plus/production-docker` into a clean image catalog, and give each image its own detail page with full instructions.

### Routes

- Keep current route working but rename canonically:
  - **Catalog**: `/elsa-plus/docker-images`
  - **Detail**: `/elsa-plus/docker-images/:slug`
- Add a redirect from the old `/elsa-plus/production-docker` → `/elsa-plus/docker-images` so existing links don't break.
- Update `App.tsx` routes and any internal links (Elsa+ landing page card, footer, navigation if present).

### Static registry

New file `src/data/dockerImages.ts` exporting a typed `DockerImage[]`:

```ts
type DockerImage = {
  slug: string;                    // e.g. "elsa-pro-server"
  name: string;                    // "Elsa Pro Server"
  tagline: string;                 // one-liner for the card
  description: string;             // longer copy for the detail hero
  image: string;                   // "valenceworks/elsa-pro-server"
  icon: LucideIcon;                // visual on the card
  tags: string[];                  // ["Server", "Preview", "Free"]
  highlights: string[];            // 3 bullet points for the card
  defaultPort: number;             // 8080 / 8081 ...
  // Per-image instruction blocks:
  envVars?: { key: string; description: string; required?: boolean }[];
  runCommand: string;              // docker run snippet
  composeService: string;          // YAML fragment for this service
  notes?: string[];                // extra notes (e.g. Studio backend URL)
  dockerHubUrl: string;
};
```

Initial entries:
1. `elsa-pro-server` — API server, port 8080, admin/identity env vars.
2. `elsa-pro-studio-blazorserver` — Blazor Server Studio, port 8081, `Backend__Url` env var.

Adding a new image later = one entry in this file.

### Catalog page (`src/pages/enterprise/DockerImages.tsx`)

Sections:
1. **Hero** — same badges (Provided by Valence Works, Early Preview, Free to try), short intro paragraph about the program (CShells, Nuplane, mounted `config.json`).
2. **Available images** — grid of `DockerImageCard`s built from the registry. Each card:
   - Icon + name
   - One-line description
   - 2-3 key highlight bullets
   - Tag pills (Server / Studio / Preview)
   - "View instructions" CTA → `/elsa-plus/docker-images/:slug`
3. **Roadmap** (kept from current page).
4. **Resources** (Docker Hub org, GitHub repo, Issues, Discussions).
5. **Neutrality disclaimer**.

Removed from the catalog: long quick-start, compose, config.json deep-dive, per-shell admin, Nuplane example, image tag table — all of these move to the detail page (and the shared concepts map to the per-image instruction page).

### Detail page (`src/pages/enterprise/DockerImageDetail.tsx`)

Reads `:slug`, looks up the registry entry, 404s gracefully if not found. Sections:

1. **Breadcrumb**: Elsa+ › Docker Images › {Image name}
2. **Hero**: icon + name + tags + Docker Hub link + short description.
3. **Quick start (`docker run`)**:
   - Prerequisites box (Docker 20.10+, free port).
   - `docker network create elsa` step (shown if image needs the shared network — true for both current images).
   - `runCommand` from the registry.
   - Access URL + health URL where applicable.
4. **Quick start (Docker Compose)**: snippet that includes this image's `composeService` plus a minimal `networks: [elsa]` declaration.
5. **Environment variables** table from `envVars`.
6. **Configuration via mounted `config.json`** (shared explainer + precedence list + mount snippet).
7. **Per-shell admin & identity** (only for the server image — gate via a flag or just inline since server is the relevant one).
8. **Extending via Nuplane** (only for the server image).
9. **Image tags** (shared tag-pattern table — same for all images).
10. **Resources** (Docker Hub link for this image, source repo).

Shared explainer blocks (config.json, Nuplane, image tags, per-shell admin) extracted into small components in `src/components/docker-images/` so the detail page composes them and the catalog stays lean.

### New components

- `src/components/docker-images/DockerImageCard.tsx`
- `src/components/docker-images/ConfigJsonExplainer.tsx`
- `src/components/docker-images/NuplaneExplainer.tsx`
- `src/components/docker-images/ImageTagsTable.tsx`
- `src/components/docker-images/PerShellAdminExplainer.tsx`
- `src/components/docker-images/index.ts`

Reuse existing `CodeBlock` and `PrerequisitesBox` from `src/components/get-started/`.

### Out of scope

- Pulling live tag/version data from Docker Hub (static registry only).
- Search/filter on the catalog (only 2 images today).
- A "compare images" view.
