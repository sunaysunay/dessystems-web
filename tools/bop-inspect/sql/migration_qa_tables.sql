-- Migration: qa_checks + qa_check_runs (bop-inspect Phase 2)
-- Run once in Supabase SQL editor.

create table if not exists qa_checks (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  description text not null,
  sql         text not null,
  severity    text not null check (severity in ('critical','high','medium','low')),
  enabled     boolean default true,
  created_at  timestamptz default now()
);

create table if not exists qa_check_runs (
  id              uuid primary key default gen_random_uuid(),
  check_id        uuid references qa_checks(id),
  run_at          timestamptz default now(),
  violation_count int not null,
  sample          jsonb
);

alter table qa_checks     enable row level security;
alter table qa_check_runs enable row level security;

drop policy if exists p_qa_checks_service     on qa_checks;
drop policy if exists p_qa_check_runs_service on qa_check_runs;
create policy p_qa_checks_service     on qa_checks     for all to service_role using (true) with check (true);
create policy p_qa_check_runs_service on qa_check_runs for all to service_role using (true) with check (true);

drop policy if exists p_qa_checks_admin     on qa_checks;
drop policy if exists p_qa_check_runs_admin on qa_check_runs;
create policy p_qa_checks_admin     on qa_checks     for select to authenticated
  using ((auth.jwt()->'app_metadata'->>'bop_role') in ('super_admin','platform_admin'));
create policy p_qa_check_runs_admin on qa_check_runs for select to authenticated
  using ((auth.jwt()->'app_metadata'->>'bop_role') in ('super_admin','platform_admin'));

insert into bop_objects (object_id, type, module, name, route, status, lifecycle_state) values
  ('table:qa_checks',     'table', 'SYS', 'QA Checks',     null, 'active', 'active'),
  ('table:qa_check_runs', 'table', 'SYS', 'QA Check Runs', null, 'active', 'active')
on conflict (object_id) do nothing;

-- Seed: 5 business invariants
insert into qa_checks (code, description, sql, severity) values
('LISTING_PUBLISHED_NEEDS_IMAGE',
 'Published listings must have at least one image',
 'select l.id, l.title, l.status from bop_listings l where l.status = ''published'' and not exists (select 1 from bop_listing_media m where m.listing_id = l.id and m.media_type = ''image'') limit 10',
 'high'),
('DEALER_APP_APPROVED_HAS_TENANT',
 'Approved dealer applications must have tenant_id set',
 'select id, email, status, tenant_id from dos_dealer_applications where status = ''approved'' and tenant_id is null limit 10',
 'critical'),
('BOP_SCREEN_MISSING_ROUTE',
 'Active BOP screens registered without a route',
 'select screen_id, title, route from bop_screens where status = ''active'' and (route is null or route = '''') limit 10',
 'medium'),
('BOP_OBJECT_ORPHAN',
 'bop_objects screen entries with no matching bop_screens row',
 'select o.object_id, o.type from bop_objects o where o.type = ''screen'' and not exists (select 1 from bop_screens s where s.screen_id = split_part(o.object_id, '':'', 2)) limit 10',
 'low'),
('BOP_TENANT_ACTIVE_LISTING',
 'Active listings referencing a non-existent bop_tenant',
 'select l.id, l.title, l.tenant_id from bop_listings l where l.status in (''published'',''active'') and l.tenant_id is not null and not exists (select 1 from bop_tenants t where t.tenant_id = l.tenant_id) limit 10',
 'critical')
on conflict (code) do nothing;
