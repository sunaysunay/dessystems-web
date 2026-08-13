# DES BOP Console — AI Working Instructions

This file is loaded by every AI agent (Claude, Cursor, Copilot, Gemini, etc.) before touching this codebase.
**All rules below are mandatory. Do not skip any step. Do not ask the user if you can skip — you cannot.**

---

## Environment

| Instance | Port | Directory | Purpose |
|----------|------|-----------|---------|
| Dev  | 4401 | `/opt/dessystems-console-dev` | All editing happens here |
| Prod | 4400 | `/opt/dessystems-console`     | Never edit directly |

**Always edit dev. Promote with:** `bash /root/scripts/promote.sh --confirm`

---

## Adding or editing a screen — MANDATORY checklist

Run the validator at any point:
```bash
node /root/scripts/bop-screen-validate.js XX000
node /root/scripts/bop-screen-validate.js --all
```

Every new screen requires ALL of the following. The validator will catch failures.

### 1. Code

- **Page file** — `app/console/{mod}/{screen}/page.tsx`
  - Use `'use client'` if using state/effects
  - Import `ScreenHeader` from `@/components/ScreenBadge`
  - Never use `useCallback` for filter/load functions — causes Next.js build type error
  - Use `getServerClient()` from `@/lib/supabase-server` in API routes (not browser client)

- **API routes** — `app/api/bop/{mod}/{resource}/route.ts`
  - Add `export const dynamic = 'force-dynamic'` at top of every route file

- **Screen registry** — `lib/screen-registry.ts`
  - Add: `'/console/mod/screen': { id: 'XX000', title: '...', mod: 'MOD' }`
  - ID format: 2 uppercase letters + 3 digits (e.g. `DV004`)

- **Manifests** — `lib/bop/manifests/index.ts`
  - Add `BopScreen` entry: `{ object_id:"screen:XX000", type:"screen", module:"MOD", name:"...", route:"/console/...", status:"active" }`
  - Add `BopApi` entries for each API route created

### 2. Access control

- **`middleware.ts` → `ROLE_MODULES`**
  - Add the module code to every role that needs access
  - Minimum: `super_admin` and `platform_admin`
  - This is a positive allowlist — omitting a module means access denied for ALL roles including super_admin
  - New module? Also add to `SEG_TO_MODULE`: `seg: 'MOD'`

### 3. Navigation

- **`components/Shell.tsx` NAV array**
  - Add item using `tn('keyName')` — never hardcoded strings
  - Group labels use `tg('groupKey')` — never hardcoded strings

- **All 5 language files** — `messages/en.json`, `nl.json`, `de.json`, `fr.json`, `tr.json`
  - Add nav label key under `"nav"`: `"keyName": "Translated Label"`
  - Add group key under `"groups"` if new group
  - Add screen code under `"screens"`: `"XX000": "Screen Title"`

### 4. Database (Supabase)

These steps are **not optional** — the TC search, SUIM, and access audit all read from Supabase, not from local files.

- **`bop_modules`** — must exist before screens can be inserted (FK constraint)
  - Required: `module_id`, `code` (2-letter prefix), `name`, `layer`, `layer_name`, `phase`
  - Valid `status`: `planned` | `in_progress` | `live`

- **`bop_screens`** — one row per screen
  - Required: `screen_id`, `module` (FK), `func_type`, `sequence`, `title`, `route`
  - Nav: `nav_group`, `nav_order`, `nav_visible=true`
  - `lifecycle_state` must be `dev` (only value the check constraint allows)

- **`bop_screen_roles`** — assign screen to roles
  - At minimum: `super_admin` with `can_read=true, can_write=true, can_delete=true`
  - Also assign `platform_admin` at minimum

### 5. Validate and promote

```bash
# Validate — fix all FAILED items before continuing
node /root/scripts/bop-screen-validate.js XX000

# Promote dev → prod
bash /root/scripts/promote.sh --confirm
```

---

## Module naming conventions

| Prefix | Module ID | Path segment |
|--------|-----------|--------------|
| SY | SYS | `sys` |
| DV | DEV | `dev` |
| IT | INT | `int` |
| FI | FIN | `fin` |
| SA | SAL | `sal` |
| MK | MKP | `mkp` |
| CR | CRM | `crm` |
| AN | ANL | `anl` |
| BO | BOP | `bop` |

---

## Key files

| File | Purpose |
|------|---------|
| `lib/screen-registry.ts` | Screen ID → route map (local, used by ScreenBadge) |
| `components/Shell.tsx` | Nav sidebar — all labels must use i18n keys |
| `messages/{lang}.json` | Translations: en / nl / de / fr / tr |
| `middleware.ts` | RBAC route protection — SEG_TO_MODULE + ROLE_MODULES |
| `lib/bop/manifests/index.ts` | BOP object catalog (screens, APIs, tables) |
| `/root/scripts/bop-screen-validate.js` | Validator — run before every promote |
| `/root/scripts/promote.sh` | Zero-downtime dev → prod promotion |
| `SCREEN_CHECKLIST.md` | Full written checklist with common mistakes |

---

## Common mistakes — these WILL be caught by the validator

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Missing module in `ROLE_MODULES` | Access denied even for super_admin | Add module code to middleware.ts |
| Screen not in `bop_screens` | TC search returns "No screen found" | Upsert into bop_screens + bop_screen_roles |
| Module not in `bop_modules` | FK error on bop_screens insert | Insert bop_modules row first |
| `useCallback` in page component | Build fails with Next.js type error | Use plain function instead |
| `${}` JSX via SSH heredoc | Bash expands template literals | Write via Python script + scp, never inline heredoc |
| Editing prod directly | Changes lost on next promote | Always edit dev, then promote.sh |
| Missing translation keys | Nav shows raw key string | Add to all 5 language files |

---

## Build notes

- Node heap must be capped: `NODE_OPTIONS="--max-old-space-size=2048"` (promote.sh handles this)
- Never run `rm -rf .next` in dev — it wipes the shared build and breaks the site
- Turbopack only for dev server; standard webpack for prod build
