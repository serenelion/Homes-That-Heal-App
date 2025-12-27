# Homes That Heal – Supabase powered scan assistant

Speech-first, Kiri Engine–optimized room scanning app built with Vite + React + TypeScript and deployed on Netlify. Supabase provides persistence (Postgres + Storage) and Edge Functions for the Gemini-powered scan consultant and Kiri pipeline.

## Prerequisites

- Node.js 18+
- Supabase CLI (`npm install -g supabase`)
- Netlify account for hosting the frontend

## Environment variables

Frontend (`.env.local` or Netlify build environment):

```
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
# optional override, defaults to ${VITE_SUPABASE_URL}/functions/v1
VITE_SUPABASE_FUNCTIONS_BASE_URL=<functions-url>
```

Edge Functions / Supabase project secrets (set via `supabase secrets set` or the Supabase dashboard):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY` (server-side only)
- `KIRI_API_KEY` (server-side only)
- `KIRI_UPLOAD_URL` / `KIRI_STATUS_URL` (optional overrides for Kiri endpoints)

## Install & run locally

```bash
npm install
npm run dev
```

Scripts:

- `npm run dev` – start Vite
- `npm run build` – production bundle
- `npm run preview` – serve built bundle
- `npm run typecheck` – TypeScript only
- `npm run lint` – alias for typecheck (no ESLint yet)

The app falls back to Local Mode (in-memory projects) when Supabase env vars are missing to keep prototyping unblocked.

## Supabase setup (infrastructure-as-code)

1. Install the CLI (`npm install -g supabase`) and authenticate (`supabase login`).
2. Link to your project: `supabase link --project-ref <project-ref>`.
3. Apply migrations: `supabase db push`.
4. Buckets and RLS are defined in `supabase/migrations/20250206120000_init.sql`:
   - Tables: `scan_projects`, `scan_assets`, `scan_events`, `recon_jobs`, `models`
   - Bucket: `scan-photos` (private)
   - RLS uses a generated `device_id` header (`x-device-id`) for the no-auth prototype. The client stores this in `localStorage`; clearing storage will break access to existing rows.

## Edge Functions

Functions live in `supabase/functions/`:

- `scan-agent` — enforces scan playbook rules and optionally calls Gemini.
- `kiri-start` — streams Supabase Storage assets to Kiri and records recon jobs.
- `kiri-status` — polls Kiri, updates recon job state, and writes GLB links.

Deploy:

```bash
supabase functions deploy scan-agent --project-ref <project-ref>
supabase functions deploy kiri-start --project-ref <project-ref>
supabase functions deploy kiri-status --project-ref <project-ref>
```

Provide secrets before deploy (example):

```bash
supabase secrets set --env-file ./functions.env --project-ref <project-ref>
```

`functions.env` should include `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `KIRI_API_KEY`, and any optional Kiri endpoint overrides.

## Netlify deployment

1. Set build command to `npm run build` and publish directory to `dist`.
2. Add the frontend env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, optional `VITE_SUPABASE_FUNCTIONS_BASE_URL`).
3. Redeploy the site so the client can reach the Supabase Edge Functions.

## Manual steps checklist

- [ ] Create a Supabase project and run `supabase db push` to apply the migration.
- [ ] Configure secrets: `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `KIRI_API_KEY`, and Supabase URLs.
- [ ] Deploy Edge Functions (`scan-agent`, `kiri-start`, `kiri-status`).
- [ ] Confirm the private storage bucket `scan-photos` exists (migration inserts it).
- [ ] Set Netlify environment variables for the client bundle and redeploy.
