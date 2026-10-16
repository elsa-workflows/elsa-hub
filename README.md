# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Blog prerender sync

See [docs/blog-sync.md](docs/blog-sync.md).

## Academy import

Loads Curriculum's lesson plan into `academy_courses`, `academy_lessons` and `academy_assets`, and uploads kit zips to the private `academy-kits` bucket. Run locally with a service role. Do not commit secrets. Do not `supabase db push`.

Dry-run is the default. Every database or storage write needs `--apply`. `npm run academy:import` does not pass `--apply`. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are read only with `--apply`.

```sh
npx tsx scripts/academy-import.ts \
  --manifest academy/lesson-plan.json \
  --source-root /path/to/sources \
  --source-commit <elsa-plus-training sha> \
  --assets-dir /path/to/zips
```

`--source-root` is required and is never read from the JSON. It may be:

- a box checkout whose paths match `source_md` in the lesson plan (rewrites plus leading H1 strip), or
- a `valence-works/elsa-plus-training` checkout that contains `content/courses/<slug>/course.json` and `NN-<lesson>.md`

Lesson `source_md` / `body_md_file` and asset `file` / `source` paths must stay inside `--source-root` or `--assets-dir`. Absolute paths and `..` are refused.

`--source-commit` is recorded in the dry-run summary so a production import can pin the git revision. Product codes, launch prices and the R2 `product_codes` allow-list live in `academy/product-mapping.json`. Extra per-course files (relative path inside `--source-root` or `--assets-dir`, with `label`, `file`, `sha256`, `size_bytes`) go in `courses[].extra_assets`. Catalog courses stay unpublished unless you pass `--publish` with `--apply`; publish runs last, after content and assets succeed.

Apply (after merge, Elsa Control Lead told first):

```sh
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...
export STRIPE_PRICE_ID_SOLO_BUNDLE=price_...
export STRIPE_PRICE_ID_TEAM_5=price_...
export STRIPE_PRICE_ID_TEAM_10=price_...
npx tsx scripts/academy-import.ts \
  --manifest academy/lesson-plan.json \
  --source-root /home/box/curriculum \
  --source-commit <sha> \
  --assets-dir /path/to/zips \
  --apply
# add --publish only when the catalog should go live after this run succeeds
```

1 Nov Solo Bundle switch to 3900 cents, with a new Stripe price id (`^price_[A-Za-z0-9_]+$`):

```sh
npx tsx scripts/academy-import.ts --price-switch --stripe-price-id price_...
npx tsx scripts/academy-import.ts --price-switch --stripe-price-id price_... --apply
# or: psql "$DATABASE_URL" -v stripe_price_id=price_... -f scripts/academy-price-switch.sql
```

