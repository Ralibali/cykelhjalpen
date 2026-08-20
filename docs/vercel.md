# Vercel

Preview deploys on pull requests. Production deploys from `main`.

Bun is pinned by `packageManager` (`bun@1.2.0`) in `package.json`. Do not set `bunVersion` — that switches the Functions runtime, not the install/build toolchain.

Leave `SITE_HOST` unset (or `cykelhjalpen`). Never `updro`: preview `*.vercel.app` hosts must render Cykelhjälpen.

Lovable stays live until a later DNS cutover. Keep `public/_headers` and `public/_redirects` so Lovable publish still works.

Vercel env (optional; `vite.config.ts` already has fallbacks): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.
