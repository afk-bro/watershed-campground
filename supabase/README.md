This repository uses hosted Supabase for runtime environments.

What we keep in this folder:

- `migrations/` — schema history (source-of-truth; keep)
- `types.ts` and generated DB typings — used by the app (keep)
- Any authored SQL functions, policies, and extensions (keep)

What is intentionally not part of this repo's runtime:

- `config.toml`, `seed.local.sql`, `docker/`, `.temp/` — local CLI/Docker runtime files. These are local-only and not used for hosted deployments.

Recommended workflow:

1. Link repo to hosted Supabase: `supabase link --project-ref <project_ref>`
2. Apply schema changes to hosted: `supabase db push`
3. Generate types against hosted (optional):
   `supabase gen types typescript --project-id <project_ref> --schema public > supabase/types.ts`

If you need local development, consider keeping a separate branch or private artifacts for local CLI config. The default project setup intentionally avoids running `supabase start` locally.
