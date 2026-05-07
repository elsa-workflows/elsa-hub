## Update Production Docker Images page with Early Preview content

Rewrite `src/pages/enterprise/DockerImages.tsx` to reflect the now-available early preview of `valenceworks/elsa-pro-server` and `valenceworks/elsa-pro-studio-blazorserver`, free to try out. Replace the "Coming Soon" / "Notify Me" framing with overview + getting-started steps grounded in CShells/Nuplane configuration, and include a sample `docker-compose.yml`.

### Page structure

1. **Hero**
   - Badges: "Provided by Valence Works", "Early Preview", "Free to try"
   - Title: "Production Docker Images"
   - Subtitle: hardened, production-oriented Elsa container built on .NET 10 with Elsa 3.8 preview, configurable via mounted `config.json`, NuGet feeds + packages loaded at runtime (Nuplane), and per-shell features (CShells).

2. **What's in the box** (feature grid, ~6 items, lucide icons)
   - Workflow runtime + Blazor Server Studio
   - CShells multi-shell architecture (multiple isolated engines per host)
   - Nuplane runtime plugin system (NuGet packages loaded at startup)
   - Identity & per-shell admin provisioning
   - OpenTelemetry observability (metrics, traces, logs)
   - Health endpoints (`/health`, `/alive`)

3. **Quick Start — `docker run`** (use existing `DockerSection` + `CodeBlock`)
   - **Prerequisites box**: Docker 20.10+, free ports 8080/8081
   - **Step 1 — Create a shared network**: `docker network create elsa`
   - **Step 2 — Run Elsa Pro Server** (`valenceworks/elsa-pro-server:latest`) on `--network elsa`, port 8080, with env vars:
     - `CShells__Shells__0__Features__DefaultAdminUser__AdminUsername`
     - `CShells__Shells__0__Features__DefaultAdminUser__AdminPassword`
     - `CShells__Shells__0__Features__Identity__SigningKey`
     - Access URL `http://localhost:8080`, health `http://localhost:8080/health`
   - **Step 3 — Run Elsa Pro Studio** (`valenceworks/elsa-pro-studio-blazorserver:latest`) on `--network elsa`, port 8081, with `Backend__Url=http://elsa-server:8080/elsa/api`. Note: Studio reaches the server by container name on the Docker network; open Studio at `http://localhost:8081`.

4. **Quick Start — Docker Compose** (new section)
   - Short intro: easier to manage than two `docker run` commands; everything on one network, config files mounted from disk.
   - `<CodeBlock language="yaml" title="docker-compose.yml">` containing a minimal but realistic compose file:
     ```yaml
     services:
       elsa-server:
         image: valenceworks/elsa-pro-server:latest
         ports:
           - "8080:8080"
         environment:
           CShells__Shells__0__Features__DefaultAdminUser__AdminUsername: admin
           CShells__Shells__0__Features__DefaultAdminUser__AdminPassword: YourSecurePassword123!
           CShells__Shells__0__Features__Identity__SigningKey: replace-with-256-bit-key
         volumes:
           - ./config/elsa-server/config.json:/config/config.json
         networks: [elsa]

       elsa-studio:
         image: valenceworks/elsa-pro-studio-blazorserver:latest
         ports:
           - "8081:8080"
         environment:
           Backend__Url: http://elsa-server:8080/elsa/api
         volumes:
           - ./config/elsa-studio/config.json:/config/config.json
         depends_on: [elsa-server]
         networks: [elsa]

     networks:
       elsa:
     ```
   - One-liner: `docker compose up -d`, then open `http://localhost:8081`.

5. **Configuration via mounted `config.json`**
   - Short paragraph + precedence list (appsettings → `/config/config.json` → env vars)
   - `CodeBlock` showing the `-v $(pwd)/config.json:/config/config.json` mount
   - Note that an annotated `config.example.json` ships in the repo

6. **Per-shell admin & identity (CShells)**
   - JSON snippet for `DefaultAdminUser` feature under `CShells.Shells.Default.Features` (username/password/role/permissions)
   - Call out: `Identity__SigningKey` must be set to a secure 256-bit value in production; never ship the placeholder

7. **Extending via Nuplane**
   - Short paragraph: configure NuGet feed + package list in `config.json`; packages (Postgres, SQL Server, RabbitMQ, Azure Service Bus, Quartz, etc.) are downloaded at startup and enabled per shell through CShells features. Catalog of feeds/packages will be documented separately.
   - Small JSON snippet of `PostgreSqlWorkflowPersistence` / `PostgreSqlIdentityPersistence` connection strings under `CShells.Shells.Default.Features` as a concrete example.

8. **Image tags** (small table)
   - `latest`, `<version>-preview.<build>`, stable `<version>`, `<major>.<minor>`, `<major>`, `elsa-<elsa-version>`, `sha-<commit>`
   - Two available images: `valenceworks/elsa-pro-server`, `valenceworks/elsa-pro-studio-blazorserver`

9. **Roadmap** (compact list, clearly marked as "Planned, not yet available")
   - Hardened security defaults & container scanning
   - Multi-tenancy
   - AI-assisted workflow development
   - Enterprise integrations (SAP, Salesforce, …)
   - HA deployment templates
   - Reverse proxy templates (nginx, Traefik)

10. **Resources / Links**
    - Docker Hub: `valenceworks/elsa-pro-server`, `valenceworks/elsa-pro-studio-blazorserver`
    - GitHub repo: https://github.com/valence-works/elsa-pro-docker
    - Issues + Discussions

11. **Neutrality disclaimer** — keep existing `<NeutralityDisclaimer />` at the bottom.

### What to remove

- "Coming Soon" badge
- "Notify Me" CTA + `NewsletterSubscribeDialog` import/usage on this page
- The generic 3-feature grid (replaced by the richer "What's in the box")

### Technical notes

- Reuse `DockerSection`, `CodeBlock`, `PrerequisitesBox` from `src/components/get-started/`.
- Add `yaml` to `CodeBlock`'s `languageMap` (maps to Prism `yaml`) so the compose snippet highlights correctly.
- For JSON config snippets, use `<CodeBlock language="json" />`.
- Confident senior tone per project memory; no marketing buzzwords; clearly label "Early preview" and "Planned" where applicable.
- Semantic Tailwind tokens only; no raw colors.
- Pure presentation update — no DB, edge-function, or business-logic changes.

### Out of scope

- Cross-linking from the open-source Get Started Docker page to these Pro images.
- Generating a downloadable example `config.json` artifact.
