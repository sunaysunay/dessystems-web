-- Tables without RLS enabled
-- Must return zero rows to pass.

select schemaname, tablename
from pg_tables
where schemaname = 'public'
  and not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relname = tablename and n.nspname = schemaname
      and c.relrowsecurity = true
  )
order by tablename;
