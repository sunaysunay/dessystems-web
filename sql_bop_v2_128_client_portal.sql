-- BOP v2.128 — Client Portal (CR030)
-- Customer-facing portal: code-gated access, offers with versions + approval flow,
-- shared documents, full activity log.
--
-- ✅ APPLIED 2026-09-07 via bop_console_ddl (des-sql.sh pipeline). Kept for reference.
-- Re-running requires the bop_console_ddl role (table owner): the Supabase SQL editor
-- runs as `postgres`, which does not own these tables → "42501: must be owner".
-- All statements below are idempotent, so a re-run as bop_console_ddl is harmless.

-- ── Clients ─────────────────────────────────────────────────────────────
create table if not exists portal_clients (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  contact_name  text,
  email         text,
  partner_id    uuid,                          -- optional link to mdm_business_partners
  locale        text not null default 'nl',
  code_salt     text not null,
  code_hash     text not null,                 -- sha256(code|salt); plain code never stored
  status        text not null default 'active' check (status in ('active','suspended','closed')),
  expires_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── Offers (proposals the client can approve / adjust / decline) ────────
create table if not exists portal_offers (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references portal_clients(id) on delete cascade,
  offer_no        text,
  title           text not null,
  summary         text,
  status          text not null default 'draft'
                  check (status in ('draft','sent','viewed','changes_requested','approved','declined','withdrawn')),
  current_version int not null default 1,
  currency        text not null default 'EUR',
  valid_until     timestamptz,
  decided_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_portal_offers_client on portal_offers(client_id, updated_at desc);

-- ── Offer versions (immutable snapshots; new adjustments = new version) ─
create table if not exists portal_offer_versions (
  id           uuid primary key default gen_random_uuid(),
  offer_id     uuid not null references portal_offers(id) on delete cascade,
  version_no   int not null,
  change_note  text,                           -- what changed vs previous version
  line_items   jsonb not null default '[]',    -- [{description, quantity, unit_price, total, optional}]
  subtotal     numeric(12,2) not null default 0,
  vat_rate     numeric(5,2) not null default 21,
  vat_amount   numeric(12,2) not null default 0,
  total        numeric(12,2) not null default 0,
  file_url     text,                           -- optional rendered PDF
  created_by   text,
  created_at   timestamptz not null default now(),
  unique (offer_id, version_no)
);

-- ── Client responses on offers ──────────────────────────────────────────
create table if not exists portal_offer_responses (
  id           uuid primary key default gen_random_uuid(),
  offer_id     uuid not null references portal_offers(id) on delete cascade,
  version_no   int not null,
  action       text not null check (action in ('approved','declined','changes_requested','comment')),
  comment      text,
  signer_name  text,
  ip           text,
  user_agent   text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_portal_offer_responses_offer on portal_offer_responses(offer_id, created_at desc);

-- ── Shared documents ────────────────────────────────────────────────────
create table if not exists portal_documents (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references portal_clients(id) on delete cascade,
  title         text not null,
  note          text,
  category      text not null default 'general'
                check (category in ('proposal','contract','report','invoice','general')),
  file_url      text,                          -- external URL (Drive export, CDN, …)
  storage_path  text,                          -- or Supabase storage path (bucket portal-docs)
  mime_type     text,
  size_bytes    bigint,
  version       int not null default 1,
  is_primary    boolean not null default false,
  sort_order    int not null default 0,
  status        text not null default 'active' check (status in ('active','archived')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_portal_documents_client on portal_documents(client_id, sort_order);

-- ── Activity / audit log (also drives login rate limiting) ─────────────
create table if not exists portal_events (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid,                            -- nullable: failed logins on unknown slugs
  type        text not null,                   -- login | login_failed | view_offer | view_document | approved | declined | changes_requested | comment
  ref_id      uuid,
  detail      text,
  ip          text,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_portal_events_client on portal_events(client_id, created_at desc);
create index if not exists idx_portal_events_ratelimit on portal_events(type, ip, created_at desc);

-- ── BOP catalog: screen CR030 + roles ───────────────────────────────────
insert into bop_screens (screen_id, module, func_type, sequence, title, description, route,
                         nav_group, nav_order, nav_visible, lifecycle_state)
values ('CR030','CRM','manage','30','Client Portal',
        'Manage portal clients, offers with approval flow, shared documents and activity',
        '/console/crm/portal','salesCrm',11,true,'dev')
on conflict (screen_id) do nothing;

insert into bop_screen_roles (screen_id, role, can_read, can_write, can_delete) values
  ('CR030','super_admin',true,true,true),
  ('CR030','platform_admin',true,true,true),
  ('CR030','tenant_manager',true,true,false)
on conflict do nothing;

-- ── Grants: tables are created by bop_console_ddl; the app reads/writes via
--    the Supabase service role (PostgREST) ────────────────────────────────
grant select, insert, update, delete on
  portal_clients, portal_offers, portal_offer_versions,
  portal_offer_responses, portal_documents, portal_events
to service_role;

notify pgrst, 'reload schema';

-- FK enables PostgREST embedding of portal_clients on the events log;
-- SET NULL keeps audit rows when a client is deleted.
do $$ begin
  alter table portal_events
    add constraint portal_events_client_fk
    foreign key (client_id) references portal_clients(id) on delete set null;
exception when duplicate_object then null;
end $$;

-- Console DB roles (DB001 SQL runner / des-sql.sh)
grant select on
  portal_clients, portal_offers, portal_offer_versions,
  portal_offer_responses, portal_documents, portal_events
to bop_console_read;
grant select, insert, update, delete on
  portal_clients, portal_offers, portal_offer_versions,
  portal_offer_responses, portal_documents, portal_events
to bop_console_write;
