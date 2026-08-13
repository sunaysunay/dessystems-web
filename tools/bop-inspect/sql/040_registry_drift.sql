-- Tables in DB absent from bop_objects registry
-- Must return zero rows to pass.

select t.tablename
from pg_tables t
where t.schemaname = 'public'
  and t.tablename ~ '^(bop_|dos_|crm_|mkt_|qa_)'
  and not exists (
    select 1 from bop_objects o where o.object_id = 'table:' || t.tablename
  )
order by t.tablename;
