-- Core tables missing created_at
-- Must return zero rows to pass.

select t.tablename
from pg_tables t
where t.schemaname = 'public'
  and t.tablename ~ '^(bop_|dos_|crm_|mkt_)'
  and t.tablename not like '%_labels'
  and t.tablename not like '%_types'
  and t.tablename not like '%_roles'
  and not exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'public' and c.table_name = t.tablename and c.column_name = 'created_at'
  )
order by t.tablename;
