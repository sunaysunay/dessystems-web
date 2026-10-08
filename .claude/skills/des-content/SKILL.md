# DES Content — Platform Architecture Reference

description: Reference guide for DES Systems platform architecture — email infrastructure, BOP console modules, system features, and how they interconnect.

---

## Quick Summary

DES Systems runs a Next.js monorepo (`dessystems-web`) serving:
- **dessystems.io** — public website + product demos (port 3003, pm2 `dessystemsCom`)
- **bop.dessystems.io** — BOP Console (dev port 4401, prod port 4400)

All outbound email goes through **Zoho SMTP** (`smtp.zoho.eu:587`). Inbound email polling uses **Zoho IMAP** (`imappro.zoho.eu:993`). The platform has two email template generations (V1 + V2) running in parallel, plus several inline-template senders.

---

## 1. Email Infrastructure

### 1.1 SMTP Configuration (Zoho)

| Variable | Default | Purpose |
|----------|---------|---------|
| `SMTP_HOST` | `smtp.zoho.eu` | Zoho SMTP server |
| `SMTP_PORT` | `587` | STARTTLS port |
| `SMTP_USER` | _(required)_ | Zoho account email |
| `SMTP_PASS` | _(required)_ | Zoho app password |
| `SMTP_FROM` | `"DES Systems" <SMTP_USER>` | Default From header |
| `SMTP_SECURE` | `false` | Set `'true'` for TLS (usually false = STARTTLS) |

### 1.2 IMAP Configuration (Zoho)

| Variable | Default | Purpose |
|----------|---------|---------|
| `IMAP_HOST` | `imappro.zoho.eu` | Zoho IMAP server |
| `IMAP_PORT` | `993` | SSL port |
| `IMAP_USER` | falls back to `SMTP_USER` | IMAP account |
| `IMAP_PASS` | falls back to `SMTP_PASS` | IMAP password |

### 1.3 Core Email Libraries

#### V1: Simple Mailer (`lib/bop-mailer.ts`)
- Singleton nodemailer transport
- Exports: `smtpConfigured()`, `sendBopMail(to, subject, html)`
- Used by: contact form, dealer applications, buyer-inbox replies, appointments, password reset, portal offers, support, short-link clicks

#### V1: Template Resolver (`lib/bop-email.ts`)
- Resolves templates from `bop_email_*` Supabase tables
- Exports: `resolveBopEmail(tenantId, emailType, locale)`, `renderBopEmail(tenantId, emailType, locale, vars)`
- Tenant/locale fallback chain: `(tenant,type,locale)` → `(tenant,type,en)` → `(0,type,locale)` → `(0,type,en)`
- Variable system: `{{var_name}}` (flat mustache-style)

#### V2: Communication Center (`lib/comm/`)
Full 3-stage MJML render pipeline:

| Stage | File | Purpose |
|-------|------|---------|
| 1 | `lib/comm/compile.ts` | Injects branding tokens into MJML source |
| 2 | `lib/comm/compile.ts` | MJML → HTML compilation |
| 3 | `lib/comm/resolver.ts` | Resolves `{{Namespace.Key}}` variables |

- **Send entry**: `lib/comm/send.ts` → `send(input: SendInput)`
- **Context loaders**: `lib/comm/context-bindings.ts` — 10 context types: vehicle, customer, invoice, listing, sell_lead, crm_lead, order, quotation, handover, work_order
- **Locale chain**: `lib/comm/resolve-locale.ts` — explicit → document → partner → country → tenant → 'en'
- **Variable namespaces**: `Vehicle.Brand`, `Customer.FullName`, `Invoice.Total`, `Document.Type`, etc.
- **Tables**: `bop_comm_template`, `bop_comm_master_style`, `bop_comm_branding`, `bop_comm_compile_cache`, `bop_comm_history`, `bop_comm_automation`

### 1.4 Mail Identity System

There are **two separate mail identity tables**:

#### Website identities (`mail_identity` table — tenant 500)
Used by the contact form (`app/api/contact/route.ts`).

| Code | Maps to | Used for topics |
|------|---------|-----------------|
| `DESSI_INFO` | info@dessystems.io | platform (default) |
| `DESSI_ERP` | sales@dessystems.io | erp, mes, automation |
| `DESSI_FREELANCE` | sunay@dessystems.io | freelance |
| `DESSI_NOREPLY` | noreply@dessystems.io | auto-responder |

Topic mapping in contact route:
```
erp → DESSI_ERP, mes → DESSI_ERP, automation → DESSI_ERP
freelance → DESSI_FREELANCE, platform → DESSI_INFO
```

#### BOP identities (`bop_mail_identity` table — multi-tenant)
Used by V2 comm send flow. API: `/api/bop/comm/mail-identities`

| Code | Used for context types |
|------|----------------------|
| `LEADS` | crm_lead, vehicle, sell_lead |
| `INFO` | customer, listing |
| `INVOICES` | invoice |
| `ORDERS` | order, handover |
| `QUOTES` | quotation |

### 1.5 Email Sending Routes

| Route | System | Purpose |
|-------|--------|---------|
| `/api/contact` | V1 + inline | Contact form (EM-WB01 admin + EM-WB02 auto-reply) |
| `/api/bop/comm/compose/send` | V2 | Generic V2 send |
| `/api/bop/comm/compose/preview` | V2 | Template preview (no send) |
| `/api/bop/fin/invoices/[id]/send` | V2 | Invoice email |
| `/api/bop/crm/leads/[id]/send` | V2 | CRM lead email |
| `/api/bop/sal/orders/[id]/send` | V2 | Order email (optional PDF) |
| `/api/bop/sal/sell-leads/[id]` | V2 | Sell lead offer (PATCH action) |
| `/api/bop/sys/email/reset-link` | V1 | Password reset |
| `/api/bop/sys/email/preview` | V1 | V1 template preview |
| `/api/bop/sys/email-admin` | V1 | Template/layout/brand CRUD |
| `/api/bop/sys/dealer-applications` | V1 + inline | Dealer approval/rejection (5-lang) |
| `/api/bop/sal/buyer-inbox/[id]` | V1 | Buyer reply notification |
| `/api/bop/sal/appointments/[id]` | V1 | Appointment confirmation |
| `/api/bop/crm/inbox-sync` | IMAP | Inbound email polling |
| `/api/support/v1/cases/[number]/messages` | — | Support messages (via CaseService) |
| `/app/[...slug]` | V1 | Short-link click notification |

Supporting senders:
- `lib/support/notify.ts` — support notifications (email + Telegram)
- `lib/portal/mail.ts` — portal offer notifications (5-lang)

### 1.6 Contact Form Pipeline

When a visitor submits a form on dessystems.io:

1. `POST /api/contact` receives `{ firstName, lastName, email, phone, company, message, topic }`
2. Maps `topic` → mail identity code (DESSI_INFO / DESSI_ERP / DESSI_FREELANCE)
3. Looks up identity from Supabase `mail_identity` table (tenant_id: 500)
4. Gets next lead ID via `sb.rpc("next_counter_id")` (atomic counter SY013)
5. Inserts lead into Supabase `lead` table
6. Sends admin notification (EM-WB01) — to the identity's inbox, BCC if configured, reply-to = visitor
7. Sends auto-responder (EM-WB02) — from DESSI_NOREPLY to visitor
8. Logs both emails to `bop_comm_history`
9. Returns `{ ok: true, leadId }`

### 1.7 Email Template Codes

- **EM-WB01** — Admin notification (inline HTML in contact route)
- **EM-WB02** — Auto-responder to visitor (inline HTML in contact route)
- V1 templates stored in `bop_email_template` (per tenant/type/locale)
- V2 templates stored in `bop_comm_template` with MJML master styles in `bop_comm_master_style`

---

## 2. BOP Console Modules

### 2.1 Module Registry

| Prefix | Module ID | Path segment | Name |
|--------|-----------|--------------|------|
| SY | SYS | `sys` | System |
| DV | DEV | `dev` | Development |
| IT | INT | `int` | Integration |
| FI | FIN | `fin` | Finance |
| SA | SAL | `sal` | Sales |
| MK | MKP | `mkp` | Marketing |
| CR | CRM | `crm` | CRM |
| AN | ANL | `anl` | Analytics |
| BO | BOP | `bop` | BOP |
| DA | DAE | `dae` | Data Acquisition |
| CE | CFG | `config` | Content Engine |
| GR | GRW | `grw` | Growth |

### 2.2 System Module Screens (SYS — 46 screens)

#### Users & Access
| ID | Screen | Route |
|----|--------|-------|
| SY001 | Users | `/console/sys/users` |
| SY015 | User Cockpit | `/console/sys/user-cockpit` |
| SY026 | Session Manager | `/console/sys/sessions` |
| SY016 | Access Audit | `/console/sys/access-audit` |
| SY023 | Bulk User Operations | `/console/sys/bulk-users` |
| SY041 | Dealer Applications | `/console/sys/dealer-applications` |

#### Access & Roles
| ID | Screen | Route |
|----|--------|-------|
| SY002 | Role Catalog | `/console/sys/roles` |
| SY027 | SUIM Role Browser | `/console/sys/suim` |
| SY011 | RBAC Roles | `/console/sys/rbac` |
| SY012 | Audit Log | `/console/sys/audit` |
| SY020 | Access Request Workflow | `/console/sys/access-request` |
| SY021 | SoD Conflict Report | `/console/sys/sod` |
| SY022 | Access Recertification | `/console/sys/recertification` |
| SY025 | Security Events | `/console/sys/security` |

#### Configuration
| ID | Screen | Route |
|----|--------|-------|
| SY004 | System Settings | `/console/sys/settings` |
| SY003 | Tenant Management | `/console/sys/tenants` |
| SY050 | Feature Matrix | `/console/sys/sy050` |
| SY044 | Site Theme Config | `/console/sys/theme-config` |
| SY018 | Module Manager | `/console/sys/modules` |
| SY019 | Menu Config | `/console/sys/menu-config` |
| SY024 | Screen Explorer | `/console/sys/screen-explorer` |
| SY013 | Counters | `/console/sys/counters` |

#### Communication
| ID | Screen | Route |
|----|--------|-------|
| SY039 | Template Studio | `/console/sys/comm/templates` |
| SY036 | Email Style Library | `/console/sys/comm/styles` |
| SY037 | Automation Engine | `/console/sys/comm/automation` |
| SY038 | Communication Log | `/console/sys/comm/log` |
| SY040 | Support Center | `/console/sys/support` |

#### Documentation
| ID | Screen | Route |
|----|--------|-------|
| SY034 | Documentation Browser | `/console/sys/docs` |
| SY033 | Process Library | `/console/sys/processes` |
| SY035 | Flow Map | `/console/sys/flow-map` |
| SY043 | TFE Flow Viewer | `/console/sys/tfe-flow` |
| SY028 | Object Explorer | `/console/sys/object-explorer` |
| SY014 | Handoff Doc | `/console/sys/handoff` |

#### Infrastructure
| ID | Screen | Route |
|----|--------|-------|
| SY008 | Admin Dashboard | `/console/sys/dashboard` |
| SY006 | Systems Overview | `/console/sys/overview` |
| SY005 | System Health | `/console/sys/health` |
| SY007 | DB Jobs | `/console/sys/jobs` |
| SY032 | Lock Monitor | `/console/sys/locks` |
| SY017 | IMAP Config | `/console/sys/imap` |
| SY009 | MCP | `/console/sys/mcp` |
| SY010 | Google Drive Storage | `/console/sys/drive` |

#### Development & Quality
| ID | Screen | Route |
|----|--------|-------|
| SY029 | Data Explorer | `/console/sys/data-explorer` |
| SY042 | Quality Inspector | `/console/sys/quality` |
| SY051 | Implementation Cockpit | `/console/sys/impl` |
| SY053 | Task Detail | `/console/sys/impl/tasks` |

### 2.3 Feature Matrix (SY050)

Per-tenant feature toggle system backed by `tenant_site_features` table.

**API**: `/api/bop/sys/site-features` — GET (list flags) / PATCH (toggle)

**Feature Groups (8):**

| Group | Key | Example Features |
|-------|-----|-----------------|
| SEO & Discovery | `seo` | `seo_faceted_urls`, `listing_meta`, `vehicles_meta` |
| Storefront UX | `ux` | `live_category_counts`, `show_comparison`, `hover_image_cycle`, `quick_preview`, `similar_vehicles` |
| B2B & Commercial | `b2b` | `show_btw_badge`, `btw_toggle`, `listing_card_v2`, `cargo_visualizer`, `smart_badges` |
| Pricing & Finance | `pricing` | `show_financing_teaser`, `show_deal_score`, `price_history`, `total_landed_cost` |
| Conversion & Leads | `conversion` | `sell_funnel`, `dealer_trust_card`, `fly_banner` |
| User Accounts | `accounts` | `dm_accounts` (LOCKED), `save_search`, `save_search_email` |
| Content & Media | `content` | `vehicle_story` |
| System | `system` | catch-all |

**Protection levels:**
- **Locked** (e.g. `dm_accounts`) — cannot toggle via API (HTTP 403)
- **Critical** (e.g. `listing_meta`, `sell_funnel`, `btw_toggle`) — requires "CONFIRM" modal

**Preview mode**: Generates HMAC-signed URL for `dev.desmobil.com` with 4-hour preview cookie via `/api/bop/sys/ff-preview`.

---

## 3. Key Cross-Cutting Concerns

### 3.1 Tenant Architecture
- **Tenant 500** = DES Systems (dessystems.io)
- `bop_tenants` table holds tenant config (domain, branding, SMTP, analytics, AI, Google creds)
- Tenant config API: `/api/bop/sys/tenant-config`
- Feature flags are per-tenant via `tenant_site_features`

### 3.2 User Roles
- `super_admin` — full access to everything
- `platform_admin` — admin access across modules
- `tenant_manager` — manages a specific tenant
- `editor` — content editing
- `viewer` — read-only
- User types: human, service, api, system

### 3.3 Supported Locales
`en`, `nl`, `de`, `fr`, `tr` — used across email templates, nav labels, and UI

### 3.4 VPS Architecture
- Dev: port 4401, `/opt/dessystems-console-dev`
- Prod: port 4400, `/opt/dessystems-console`
- Public site: port 3003, `/root/dessystems-web`, pm2 process `dessystemsCom`
- Deploy: GitHub Actions → SSH → `promote.sh` (console) / `npm build` (public site)
- Never edit prod directly — always edit dev, then `bash /root/scripts/promote.sh --confirm`

### 3.5 Database Tables Reference

**Email V1**: `bop_email_template`, `bop_email_brand`, `bop_email_base_layout`, `bop_email_template_map`, `bop_email_log`

**Email V2**: `bop_comm_template`, `bop_comm_master_style`, `bop_comm_branding`, `bop_comm_compile_cache`, `bop_comm_history`, `bop_comm_automation`

**Mail identities**: `mail_identity` (website, tenant 500), `bop_mail_identity` (BOP multi-tenant)

**System**: `bop_screens`, `bop_modules`, `bop_roles`, `bop_role_screens`, `bop_settings`, `bop_objects`, `bop_dependencies`, `bop_object_locks`, `bop_tenants`, `tenant_site_features`

---

## 4. Key File Paths

### Email
- `lib/bop-mailer.ts` — V1 SMTP singleton
- `lib/bop-email.ts` — V1 template resolver
- `lib/comm/send.ts` — V2 send pipeline
- `lib/comm/compile.ts` — V2 MJML compile
- `lib/comm/resolver.ts` — V2 variable resolver
- `lib/comm/context-bindings.ts` — V2 context loaders (10 types)
- `lib/comm/resolve-locale.ts` — locale resolution chain
- `lib/support/notify.ts` — support notifications
- `lib/portal/mail.ts` — portal offer emails
- `app/api/contact/route.ts` — contact form handler
- `app/api/bop/comm/` — V2 comm routes (compose, mail-identities)

### System
- `lib/screen-registry.ts` — screen ID → route map
- `components/Shell.tsx` — nav sidebar (all labels via i18n)
- `middleware.ts` — RBAC route protection
- `lib/bop/manifests/index.ts` — BOP object catalog
- `messages/{en,nl,de,fr,tr}.json` — translations

### Admin
- `app/api/bop/sys/site-features/route.ts` — feature flag API
- `app/api/bop/sys/tenant-config/` — tenant config CRUD
- `app/api/bop/sys/email-admin/route.ts` — V1 email admin
- `app/console/dev/auth-smtp-audit/page.tsx` — auth & SMTP audit page
