# DES Systems Console — `dessystems.io` (DESPANEL-V2)

The mother console over all DES platforms. Standalone app — own `.next`, own pm2 process,
fully isolated from the shared-repo per-site apps.

## Run it locally (safe — never touches the VPS)

```bash
cd despanel-v2/dessystems-app
npm install
npm run dev        # http://localhost:4400  → redirects to /console/listings
```

Runs on **mock data** out of the box (no DB needed). The header platform + tenant
switchers, env badge, Quick Create, Errors tab, channel-status dots, and RBAC-gated
buttons are all live.

## Status (see ../MANIFEST.md)
- ✅ Phase 1b — standalone app scaffold (this)
- ⏳ Phase 2 — fill `.env.local` (Supabase) → swap mock for real, scoped queries + SSO
- ⏳ Phase 3–5 — channel data, dashboard, Systems/Admin/Audit
- ⏳ Phase 6 — deploy to dessystems.io (own dir, own build/restart)

## To wire real data
1. `cp .env.local.example .env.local` and fill Supabase URL + anon key.
2. Tell Claude your table names + whether `platform_id`/`tenant_id` columns exist.
3. Claude replaces `data/mock.ts` reads with scoped Supabase queries (`lib/supabase.ts`).

Nothing here builds or deploys to the VPS. The old panel stays fully live as backup.
